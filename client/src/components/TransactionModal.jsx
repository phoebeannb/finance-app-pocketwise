import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import api from "../api/axios";
import useCategories from "../hooks/useCategories";
import { usePrefs } from "../context/PreferencesContext";
import { formatMoney } from "../utils/format";
import { nowLocalInput, toStored, toInput } from "../utils/datetime";
import { toast } from "../utils/toast";
import Modal from "./Modal";
import CategoryModal from "./CategoryModal";
import MoodPicker from "./MoodPicker";
import TagInput from "./TagInput";
import ReceiptField from "./ReceiptField";

const LAST_KEY = "pw_last_account";

const blank = () => ({
  type: "expense", amount: "", category: "", description: "", notes: "", tags: [], mood: "",
  date: nowLocalInput(), account: "", toAccount: "", hasFee: false, fee: "",
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

export default function TransactionModal({ open, onClose, onSaved, editing, initial }) {
  const [form, setForm] = useState(blank());
  const [accounts, setAccounts] = useState([]);
  const [receipt, setReceipt] = useState({ status: "none" });
  const [hint, setHint] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const { expense, income, reload } = useCategories();
  const { prefs } = usePrefs();
  const defaultAccount = prefs.defaultAccount;
  const accountsRef = useRef([]);
  accountsRef.current = accounts;

  useEffect(() => {
    if (!open) return;
    setError("");
    setHint("");
    reload();
    api.get("/accounts").then(({ data }) => {
      setAccounts(data);
      if (!editing) {
        // Smart default: the account you used last, then your default account
        let last = "";
        try { last = localStorage.getItem(LAST_KEY) || ""; } catch { /* storage blocked */ }
        const pick = [last, defaultAccount].find((id) => id && data.some((a) => a._id === id));
        if (pick) setForm((f) => (f.account ? f : { ...f, account: pick }));
      }
    }).catch(() => {});
    if (editing) {
      setForm({
        type: editing.type,
        amount: editing.amount,
        category: editing.category || "",
        description: editing.description || "",
        notes: editing.notes || "",
        tags: editing.tags || [],
        mood: editing.mood || "",
        date: toInput(editing.date),
        account: editing.account?._id || "",
        toAccount: editing.toAccount?._id || "",
        hasFee: editing.fee > 0,
        fee: editing.fee > 0 ? editing.fee : "",
      });
      setReceipt({ status: editing.hasReceipt ? "existing" : "none" });
    } else {
      setForm({ ...blank(), ...(initial || {}) });
      setReceipt({ status: "none" });
    }
  }, [open, editing, reload, defaultAccount]);

  // Smart default: suggest a category (and account) from what you typed, but only fill empty fields
  useEffect(() => {
    if (!open || editing || form.type === "transfer") return;
    const text = form.description.trim();
    if (text.length < 3) { setHint(""); return; }
    const t = setTimeout(() => {
      api.get("/transactions/suggest", { params: { description: text, type: form.type } })
        .then(({ data }) => {
          if (!data.category) { setHint(""); return; }
          const accountOk = data.account && accountsRef.current.some((a) => a._id === data.account);
          setForm((f) => ({ ...f, category: f.category || data.category, account: f.account || (accountOk ? data.account : "") }));
          setHint(data.source === "history"
            ? `Filled in from your last “${text}” entry. Change it if this one is different.`
            : "Category suggested from the description. Change it if it's wrong.");
        })
        .catch(() => {});
    }, 450);
    return () => clearTimeout(t);
  }, [open, editing, form.description, form.type]);

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
      tags: type === "transfer" ? [] : form.tags,
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
      notes: form.notes,
      tags: isTransfer ? [] : form.tags,
      mood: isTransfer ? "" : form.mood,
      date: toStored(form.date),
      account: form.account || null,
      toAccount: isTransfer ? form.toAccount || null : null,
      fee: isTransfer && form.hasFee ? Number(form.fee) : 0,
    };
    try {
      const res = editing ? await api.put(`/transactions/${editing._id}`, payload) : await api.post("/transactions", payload);
      const id = res.data._id;

      try {
        if (receipt.status === "new") await api.put(`/transactions/${id}/receipt`, { image: receipt.data }, { quiet: true });
        else if (receipt.status === "removed") await api.delete(`/transactions/${id}/receipt`, { quiet: true });
      } catch (err) {
        toast.error(err.response?.data?.message || "The transaction was saved, but the receipt photo couldn't be attached. Open it again to retry.");
      }

      if (!isTransfer && payload.account) {
        try { localStorage.setItem(LAST_KEY, payload.account); } catch { /* storage blocked */ }
      }
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
      <Modal open={open} onClose={onClose} title={editing ? "Edit transaction" : "Add transaction"} closeOnEsc={!catOpen}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1" role="group" aria-label="Transaction type">
            {TYPES.map(([value, label, color]) => (
              <button type="button" key={value} onClick={() => setType(value)} aria-pressed={form.type === value}
                className={`rounded-md py-2 text-sm font-medium ${form.type === value ? `bg-white shadow-sm ${color}` : "text-slate-600"}`}>
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
                    <Plus size={18} aria-hidden="true" />
                  </button>
                </div>
                {hint && form.category && <p className="mt-1 text-xs text-slate-600">{hint}</p>}
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
                    <input name="fee" type="number" step="0.01" min="0.01" placeholder="Transfer fee amount" aria-label="Transfer fee amount"
                      value={form.fee} onChange={handleChange} required className={field} />
                    <p className="text-xs text-slate-600">
                      The fee is taken from the source account too. Total deducted:{" "}
                      <span className="font-semibold text-slate-700">{formatMoney(totalOut)}</span>
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          <Field label="Description">
            <input name="description" placeholder="Optional note" value={form.description} onChange={handleChange} className={field} />
          </Field>

          {!isTransfer && (
            <>
              <Field label="Tags (optional)">
                <TagInput value={form.tags} onChange={(tags) => setForm({ ...form, tags })} />
              </Field>
              <Field label="How were you feeling? (optional)">
                <MoodPicker value={form.mood} onChange={(mood) => setForm({ ...form, mood })} />
              </Field>
            </>
          )}

          <Field label="Notes (optional)">
            <textarea name="notes" rows={2} maxLength={500} value={form.notes} onChange={handleChange}
              placeholder="Anything you want to remember about this" className={field} />
          </Field>

          <Field label="Receipt photo (optional)">
            <ReceiptField txId={editing?._id} state={receipt} onChange={setReceipt} />
          </Field>

          <Field label="Date & time">
            <input name="date" type="datetime-local" value={form.date} onChange={handleChange} required className={field} />
          </Field>

          <button type="submit" disabled={saving}
            className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
            {saving ? "Saving..." : editing ? "Save Changes" : "Add transaction"}
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