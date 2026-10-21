import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import api from "../api/axios";
import useCategories from "../hooks/useCategories";
import { usePrefs } from "../context/PreferencesContext";
import { formatMoney } from "../utils/format";
import { nowLocalInput, toStored, toInput } from "../utils/datetime";
import Modal from "./Modal";
import CategoryModal from "./CategoryModal";
import MoodPicker from "./MoodPicker";

const blank = () => ({
  type: "expense", amount: "", category: "", description: "", mood: "", date: nowLocalInput(),
  account: "", toAccount: "", hasFee: false, fee: "",
});

const TYPES = [
  ["income", "Income", "text-green-600"],
  ["expense", "Expense", "text-red-600"],
  ["transfer", "Transfer", "text-slate-900"],
];

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

function Field({ label, children }) {
  return (
    <div>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </div>
  );
}

export default function TransactionModal({ open, onClose, onSaved, editing }) {
  const [form, setForm] = useState(blank());
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const { expense, income, reload } = useCategories();
  const { prefs } = usePrefs();
  const defaultAccount = prefs.defaultAccount;

  useEffect(() => {
    if (!open) return;
    setError("");
    reload();
    api.get("/accounts").then(({ data }) => {
      setAccounts(data);
      // New transactions start with the default account, if it still exists
      if (!editing && defaultAccount && data.some((a) => a._id === defaultAccount)) {
        setForm((f) => (f.account ? f : { ...f, account: defaultAccount }));
      }
    }).catch(() => {});
    if (editing) {
      setForm({
        type: editing.type,
        amount: editing.amount,
        category: editing.category || "",
        description: editing.description || "",
        mood: editing.mood || "",
        date: toInput(editing.date),
        account: editing.account?._id || "",
        toAccount: editing.toAccount?._id || "",
        hasFee: editing.fee > 0,
        fee: editing.fee > 0 ? editing.fee : "",
      });
    } else {
      setForm(blank());
    }
  }, [open, editing, reload, defaultAccount]);

  const isTransfer = form.type === "transfer";
  const baseCats = form.type === "income" ? income : expense;
  const cats =
    form.category && !baseCats.some((c) => c.toLowerCase() === form.category.toLowerCase())
      ? [form.category, ...baseCats]
      : baseCats;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const setType = (type) =>
    setForm({
      ...form, type, category: "",
      mood: type === "transfer" ? "" : form.mood,
      toAccount: type === "transfer" ? form.toAccount : "",
      hasFee: type === "transfer" ? form.hasFee : false,
      fee: type === "transfer" ? form.fee : "",
    });

  const accountLabel = (a) => `${a.name} · ${formatMoney(a.currentBalance)}`;
  const totalOut = Number(form.amount || 0) + (form.hasFee ? Number(form.fee || 0) : 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (isTransfer && form.hasFee && !(Number(form.fee) > 0)) return setError("Enter the transfer fee amount");
    setSaving(true);
    const payload = {
      type: form.type,
      amount: Number(form.amount),
      category: isTransfer ? "" : form.category,
      description: form.description,
      mood: isTransfer ? "" : form.mood,
      date: toStored(form.date),
      account: form.account || null,
      toAccount: isTransfer ? form.toAccount || null : null,
      fee: isTransfer && form.hasFee ? Number(form.fee) : 0,
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
    <>
      <Modal open={open} onClose={onClose} title={editing ? "Edit transaction" : "Add Transaction"} closeOnEsc={!catOpen}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</p>}

          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
            {TYPES.map(([value, label, color]) => (
              <button type="button" key={value} onClick={() => setType(value)}
                className={`rounded-md py-2 text-sm font-medium ${form.type === value ? `bg-white shadow-sm ${color}` : "text-slate-500"}`}>
                {label}
              </button>
            ))}
          </div>

          <Field label="Amount">
            <input name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" value={form.amount}
              onChange={handleChange} required autoFocus className={`${field} text-lg`} />
          </Field>

          {!isTransfer && (
            <>
              <Field label="Account">
                <select name="account" value={form.account} onChange={handleChange}
                  required={accounts.length > 0} className={field}>
                  <option value="" disabled={accounts.length > 0}>
                    {accounts.length > 0 ? "Select account" : "No accounts yet"}
                  </option>
                  {accounts.map((a) => <option key={a._id} value={a._id}>{accountLabel(a)}</option>)}
                </select>
                {accounts.length === 0 && (
                  <p className="mt-1 text-sm text-amber-600">
                    <Link to="/accounts" onClick={onClose} className="font-medium underline">Create an account</Link> so this
                    {form.type === "income" ? " income is added to" : " expense is taken from"} it.
                  </p>
                )}
              </Field>

              <Field label="Category">
                <div className="flex gap-2">
                  <select name="category" value={form.category} onChange={handleChange} required className={`${field} min-w-0`}>
                    <option value="" disabled>Select category</option>
                    {cats.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button type="button" onClick={() => setCatOpen(true)} title="Add category" aria-label="Add category"
                    className="shrink-0 rounded-lg border border-slate-300 px-3 text-slate-600 hover:bg-slate-50">
                    <Plus size={18} />
                  </button>
                </div>
              </Field>
            </>
          )}

          {isTransfer && (
            <>
              <Field label="From account">
                <select name="account" value={form.account} onChange={handleChange} required className={field}>
                  <option value="" disabled>Select an account</option>
                  {accounts.map((a) => <option key={a._id} value={a._id}>{accountLabel(a)}</option>)}
                </select>
              </Field>

              <Field label="To account">
                <select name="toAccount" value={form.toAccount} onChange={handleChange} required className={field}>
                  <option value="" disabled>Select destination account</option>
                  {accounts.filter((a) => a._id !== form.account).map((a) => (
                    <option key={a._id} value={a._id}>{accountLabel(a)}</option>
                  ))}
                </select>
                {accounts.length < 2 && (
                  <p className="mt-1 text-sm text-amber-600">You need at least two accounts. Create them in the Accounts tab.</p>
                )}
              </Field>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                  <input type="checkbox" checked={form.hasFee}
                    onChange={(e) => setForm({ ...form, hasFee: e.target.checked, fee: e.target.checked ? form.fee : "" })}
                    className="h-4 w-4 accent-indigo-600" />
                  This transfer has a fee
                </label>
                {form.hasFee && (
                  <div className="mt-3 space-y-1">
                    <input name="fee" type="number" step="0.01" min="0.01" placeholder="Transfer fee amount"
                      value={form.fee} onChange={handleChange} required className={field} />
                    <p className="text-xs text-slate-500">
                      The fee is taken from the source account too. Total deducted:{" "}
                      <span className="font-semibold text-slate-700">{formatMoney(totalOut)}</span>
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          <Field label="Description">
            <input name="description" placeholder="Optional note" value={form.description}
              onChange={handleChange} className={field} />
          </Field>

          {!isTransfer && (
            <Field label="How were you feeling? (optional)">
              <MoodPicker value={form.mood} onChange={(mood) => setForm({ ...form, mood })} />
            </Field>
          )}

          <Field label="Date & time">
            <input name="date" type="datetime-local" value={form.date} onChange={handleChange} required className={field} />
          </Field>

          <button type="submit" disabled={saving}
            className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Saving..." : editing ? "Save changes" : "Add transaction"}
          </button>
        </form>
      </Modal>

      <CategoryModal
        open={catOpen}
        type={form.type === "income" ? "income" : "expense"}
        existing={baseCats}
        onClose={() => setCatOpen(false)}
        onCreated={(name) => { setForm((f) => ({ ...f, category: name })); reload(); }}
      />
    </>
  );
}