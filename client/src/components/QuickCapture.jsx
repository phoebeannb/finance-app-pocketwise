import { useState } from "react";
import api from "../api/axios";
import { nowLocalInput, toStored } from "../utils/datetime";
import { toast } from "../utils/toast";

const field =
  "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function QuickCapture({ onCaptured }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (!(n > 0)) return toast.error("Enter the amount first.");
    setSaving(true);
    try {
      await api.post(
        "/transactions",
        { type, amount: n, description: note.trim(), category: "", account: null, toAccount: null, fee: 0, date: toStored(nowLocalInput()) },
        { successMessage: "Saved to your inbox. Sort it when you have a minute." }
      );
      setAmount("");
      setNote("");
      onCaptured?.();
    } catch { /* the red message explains what to fix */ } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-semibold">Quick capture</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
          {[["expense", "Expense"], ["income", "Income"]].map(([v, label]) => (
            <button type="button" key={v} onClick={() => setType(v)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${type === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{label}</button>
          ))}
        </div>
        <input type="number" min="0.01" step="0.01" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${field} w-32`} />
        <input placeholder="What was it for? (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} className={`${field} min-w-48 flex-1`} />
        <button type="submit" disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
          {saving ? "Saving..." : "Add to inbox"}
        </button>
      </div>
    </form>
  );
}