import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ReceiptText, ScanLine, Upload } from "lucide-react";
import api from "../api/axios";
import { fmtDateTime, nowLocalInput, toStored } from "../utils/datetime";
import { resizeToDataUrl } from "../utils/imageResize";
import { scanReceipt } from "../utils/receiptOcr";
import { toast } from "../utils/toast";
import { formatMoney } from "../utils/format";
import Modal from "./Modal";

const button =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60";

export default function ReceiptUploadModal({ open, onClose, onSaved }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [added, setAdded] = useState(null);

  useEffect(() => {
    if (open) {
      setStatus("idle");
      setError("");
      setAdded(null);
    }
  }, [open]);

  const saveReceipt = async (file) => {
    setError("");
    setStatus("preparing");
    try {
      const image = await resizeToDataUrl(file);
      setStatus("scanning");
      const scanned = await scanReceipt(image);
      const amount = Number(scanned.amount);
      if (!(amount > 0)) {
        setError("We couldn't find the total on that receipt. Try a clearer photo.");
        setStatus("idle");
        return;
      }

      let category = "";
      if (scanned.description) {
        try {
          const { data } = await api.get("/transactions/suggest", {
            params: { description: scanned.description, type: "expense" },
          });
          category = data.category || "";
        } catch {
          // Saving the receipt as an uncategorized expense keeps the upload usable.
        }
      }

      setStatus("saving");
      const { data: transaction } = await api.post("/transactions", {
        type: "expense",
        amount,
        category,
        description: scanned.description || "Receipt expense",
        notes: "",
        tags: [],
        mood: "",
        account: null,
        toAccount: null,
        fee: 0,
        splits: [],
        date: toStored(nowLocalInput()),
      });

      let receiptAttached = true;
      try {
        await api.put(`/transactions/${transaction._id}/receipt`, { image }, { quiet: true });
      } catch {
        receiptAttached = false;
        toast.error("The expense was added, but the receipt photo could not be attached.");
      }

      toast.success(category ? "Receipt scanned and expense categorized." : "Receipt scanned and expense added.");
      onSaved();
      setAdded({
        amount,
        description: transaction.description,
        category: transaction.category || "Uncategorized",
        date: transaction.date,
        receiptAttached,
      });
      setStatus("done");
    } catch (err) {
      setError(err.response?.data?.message || "We couldn't scan that receipt. Try a clearer JPG or PNG photo.");
      setStatus("idle");
    }
  };

  const pick = (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    if (file) saveReceipt(file);
  };

  const busy = status !== "idle" && status !== "done";
  const message = {
    preparing: "Preparing receipt...",
    scanning: "Scanning receipt...",
    saving: "Adding expense...",
  }[status];

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={status === "done" ? "Expense added" : "Scan Receipt"}>
      <div className="space-y-4">
        {status === "done" && added ? (
          <>
            <div className="flex flex-col items-center rounded-xl border border-green-200 bg-green-50 p-5 text-center">
              <CheckCircle2 size={42} className="text-green-600" aria-hidden="true" />
              <h4 className="mt-2 text-lg font-semibold text-green-900">Receipt scanned and added</h4>
              <p className="mt-1 text-sm text-green-800">This expense was categorized and saved to your transactions.</p>
            </div>
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3 p-3">
                <ReceiptText size={20} className="text-slate-500" aria-hidden="true" />
                <span className="text-sm text-slate-600">Description</span>
                <strong className="ml-auto max-w-[60%] truncate text-right text-sm text-slate-900">{added.description}</strong>
              </div>
              <div className="flex items-center gap-3 p-3">
                <span className="text-sm text-slate-600">Amount</span>
                <strong className="ml-auto text-sm text-rose-700">{formatMoney(added.amount)}</strong>
              </div>
              <div className="flex items-center gap-3 p-3">
                <span className="text-sm text-slate-600">Category</span>
                <strong className="ml-auto text-right text-sm text-slate-900">{added.category}</strong>
              </div>
              <div className="flex items-center gap-3 p-3">
                <span className="text-sm text-slate-600">Added</span>
                <strong className="ml-auto text-right text-sm text-slate-900">{fmtDateTime(added.date)}</strong>
              </div>
              <div className="flex items-center gap-3 p-3">
                <span className="text-sm text-slate-600">Receipt</span>
                <strong className={`ml-auto text-sm ${added.receiptAttached ? "text-green-700" : "text-amber-700"}`}>
                  {added.receiptAttached ? "Attached" : "Not attached"}
                </strong>
              </div>
            </div>
            <button type="button" onClick={onClose} className={`${button} w-full`}>Done</button>
          </>
        ) : (
          <>
        <p className="text-sm leading-6 text-slate-600">
          Upload a receipt to automatically scan and record your expense.
        </p>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={pick} className="hidden" />
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className={`${button} w-full`}>
          {busy ? <ScanLine size={17} className="animate-pulse" aria-hidden="true" /> : <Upload size={17} aria-hidden="true" />}
          {busy ? message : "Upload receipt"}
        </button>
        {error && <p className="text-center text-xs text-slate-500">You can upload another photo to try again.</p>}
          </>
        )}
      </div>
    </Modal>
  );
}
