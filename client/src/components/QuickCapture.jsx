import { useId, useState } from "react";
import api from "../api/axios";
import { nowLocalInput, toStored } from "../utils/datetime";
import { toast } from "../utils/toast";

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function QuickCapture({ onCaptured, compact = false, autoFocus = false }) {
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const uid = useId();

  const submit = async (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (!(n > 0)) return toast.error("Enter the amount first, for example 150.");
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
    <form onSubmit={submit} aria-label="Quick capture"
      className={compact ? "" : "mb-6 rounded-lg border border-slate-200 bg-white p-4"}>
      {!compact && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">Quick Capture</h3>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-[auto_9rem_1fr_auto] sm:items-end">
        <fieldset>
          <legend className="mb-1 text-sm font-medium text-slate-700">Type</legend>
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {[["expense", "Expense"], ["income", "Income"]].map(([v, label]) => (
              <button type="button" key={v} onClick={() => setType(v)} aria-pressed={type === v}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${type === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"}`}>{label}</button>
            ))}
          </div>
        </fieldset>
        <div>
          <label htmlFor={`${uid}-amount`} className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
          <input id={`${uid}-amount`} type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} autoFocus={autoFocus}
            onChange={(e) => setAmount(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor={`${uid}-note`} className="mb-1 block text-sm font-medium text-slate-700">
            What was it for? <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input id={`${uid}-note`} placeholder="e.g. lunch at Jollibee" value={note} maxLength={200}
            onChange={(e) => setNote(e.target.value)} className={field} />
        </div>
        <button type="submit" disabled={saving}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
          {saving ? "Saving..." : "Add to inbox"}
        </button>
      </div>
    </form>
  );
}