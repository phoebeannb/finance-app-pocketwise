import { useEffect, useState } from "react";
import { X } from "lucide-react";
import api from "../api/axios";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../utils/categories";

const pad = (n) => String(n).padStart(2, "0");
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const blank = () => ({ type: "expense", amount: "", category: "", description: "", date: today(), account: "", toAccount: "" });
const TYPES = [["expense", "Expense"], ["income", "Income"], ["transfer", "Transfer"]];

const field =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

export default function TransactionModal({ open, onClose, onSaved, editing }) {
  const [form, setForm] = useState(blank());
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    api.get("/accounts").then(({ data }) => setAccounts(data)).catch(() => {});
    if (editing) {
      setForm({
        type: editing.type,
        amount: editing.amount,
        category: editing.category || "",
        description: editing.description || "",
        date: editing.date.slice(0, 10),
        account: editing.account?._id || "",
        toAccount: editing.toAccount?._id || "",
      });
    } else {
      setForm(blank());
    }
  }, [open, editing]);

  if (!open) return null;

  const isTransfer = form.type === "transfer";
  const baseCats = form.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const cats = form.category && !baseCats.includes(form.category) ? [form.category, ...baseCats] : baseCats;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const setType = (type) =>
    setForm({ ...form, type, category: "", toAccount: type === "transfer" ? form.toAccount : "" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const payload = {
      ...form,
      amount: Number(form.amount),
      account: form.account || null,
      toAccount: isTransfer ? form.toAccount || null : null,
    };
    try {
      if (editing) await api.put(`/transactions/${editing._id}`, payload);
      else await api.post("/transactions", payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="max-h-[92vh] w-full space-y-3 overflow-y-auto rounded-t-3xl bg-white p-6 text-left sm:max-w-md sm:rounded-3xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">{editing ? "Edit transaction" : "Add transaction"}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
          {TYPES.map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => setType(value)}
              className={`rounded-lg py-2 text-sm font-medium ${
                form.type === value ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input name="amount" type="number" step="0.01" min="0.01" placeholder="Amount" value={form.amount}
          onChange={handleChange} required className={field} />

        {!isTransfer && (
          <select name="category" value={form.category} onChange={handleChange} required className={field}>
            <option value="" disabled>Select category</option>
            {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}

        <select name="account" value={form.account} onChange={handleChange} required={isTransfer} className={field}>
          <option value="">{isTransfer ? "From account" : "No account (optional)"}</option>
          {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
        </select>

        {isTransfer && (
          <select name="toAccount" value={form.toAccount} onChange={handleChange} required className={field}>
            <option value="">To account</option>
            {accounts.filter((a) => a._id !== form.account).map((a) => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>
        )}
        {isTransfer && accounts.length < 2 && (
          <p className="text-sm text-amber-600">You need at least two accounts to make a transfer. Create them in the Accounts tab.</p>
        )}

        <input name="description" placeholder="Description (optional)" value={form.description}
          onChange={handleChange} className={field} />
        <input name="date" type="date" value={form.date} onChange={handleChange} required className={field} />

        <button type="submit" disabled={saving}
          className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {saving ? "Saving..." : editing ? "Save changes" : "Add transaction"}
        </button>
      </form>
    </div>
  );
}