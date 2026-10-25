import { useEffect, useState } from "react";
import api from "../api/axios";
import useCategories from "../hooks/useCategories";
import { toast } from "../utils/toast";
import Modal from "./Modal";

const field = "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none shadow-sm transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100";
const today = () => new Date().toISOString().slice(0, 10);

export default function BillQuickAdd({ open, onClose, onSaved }) {
  const { expense, reload } = useCategories();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState({ name: "", amount: "", category: "", cadence: "monthly", nextDate: today(), account: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({ name: "", amount: "", category: "", cadence: "monthly", nextDate: today(), account: "" });
    setError("");
    reload();
    api.get("/accounts").then(({ data }) => setAccounts(data)).catch(() => setAccounts([]));
  }, [open, reload]);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const submit = async (e) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.name.trim()) return setError("Enter a bill or subscription name.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Enter an amount greater than zero.");
    if (!form.category) return setError("Choose a category.");
    setSaving(true);
    try {
      await api.post("/recurring", { ...form, amount, account: form.account || null, type: "expense", autoRenew: false, trialEnds: "", reminderDays: 3 });
      toast.success("Bill added.");
      onClose();
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || "Could not add this bill.");
    } finally {
      setSaving(false);
    }
  };

  return <Modal open={open} onClose={onClose} title="Quick add bill">
    <p className="mb-4 text-sm text-slate-600">Add the essentials now. You can edit reminders and renewal settings later in Bills.</p>
    <form onSubmit={submit} className="space-y-4">
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <label className="block text-sm font-medium">Bill or subscription<input name="name" value={form.name} onChange={update} placeholder="e.g. Meralco or Netflix" className={field} required /></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">Amount<input name="amount" type="number" min="0.01" step="0.01" value={form.amount} onChange={update} className={field} required /></label>
        <label className="block text-sm font-medium">Frequency<select name="cadence" value={form.cadence} onChange={update} className={field}><option value="weekly">Every week</option><option value="monthly">Every month</option><option value="yearly">Every year</option></select></label>
      </div>
      <label className="block text-sm font-medium">Category<select name="category" value={form.category} onChange={update} className={field} required><option value="">Choose a category</option>{expense.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-sm font-medium">Next due date<input name="nextDate" type="date" value={form.nextDate} onChange={update} className={field} required /></label>
        <label className="block text-sm font-medium">Pay from (optional)<select name="account" value={form.account} onChange={update} className={field}><option value="">Choose account</option>{accounts.map((account) => <option key={account._id} value={account._id}>{account.name}</option>)}</select></label>
      </div>
      <button type="submit" disabled={saving} className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:translate-y-0 disabled:opacity-60">{saving ? "Saving..." : "Add Bill"}</button>
    </form>
  </Modal>;
}
