import { useEffect, useId, useRef, useState } from "react";
import api from "../api/axios";
import useCategories from "../hooks/useCategories";
import { usePrefs } from "../context/PreferencesContext";
import { formatMoney } from "../utils/format";
import { nowLocalInput, toStored } from "../utils/datetime";
import { toast } from "../utils/toast";
import Modal from "./Modal";
import MoodPicker from "./MoodPicker";

const LAST_KEY = "pw_last_account";
const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const symbol = () => formatMoney(0).replace(/[\d.,\s\u00a0]/g, "");

export default function QuickAdd({ open, onClose, onSaved, onMore }) {
  const uid = useId();
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState("");
  const [mood, setMood] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [frequent, setFrequent] = useState({ expense: [], income: [] });
  const [hint, setHint] = useState("");
  const [saving, setSaving] = useState(false);
  const { expense, income, reload } = useCategories();
  const { prefs } = usePrefs();
  const defaultAccount = prefs.defaultAccount;
  const accountsRef = useRef([]);
  accountsRef.current = accounts;

  useEffect(() => {
    if (!open) return;
    setType("expense"); setAmount(""); setNote(""); setCategory(""); setMood(""); setHint(""); setAccount("");
    reload();
    api.get("/transactions/frequent").then(({ data }) => setFrequent(data)).catch(() => {});
    api.get("/accounts").then(({ data }) => {
      setAccounts(data);
      let last = "";
      try { last = localStorage.getItem(LAST_KEY) || ""; } catch { /* storage blocked */ }
      const pick = [last, defaultAccount].find((id) => id && data.some((a) => a._id === id));
      if (pick) setAccount(pick);
    }).catch(() => {});
  }, [open, reload, defaultAccount]);

  // Suggest a category from what you typed (only fills it if you haven't chosen one)
  useEffect(() => {
    if (!open) return;
    const text = note.trim();
    if (text.length < 3) { setHint(""); return; }
    const t = setTimeout(() => {
      api.get("/transactions/suggest", { params: { description: text, type } })
        .then(({ data }) => {
          if (!data.category) { setHint(""); return; }
          const accountOk = data.account && accountsRef.current.some((a) => a._id === data.account);
          setCategory((c) => c || data.category);
          if (accountOk) setAccount((a) => a || data.account);
          setHint(data.source === "history" ? "Filled in from the last time you logged this." : "Suggested from what you typed.");
        })
        .catch(() => {});
    }, 450);
    return () => clearTimeout(t);
  }, [open, note, type]);

  const pickType = (t) => { setType(t); setCategory(""); setHint(""); };

  const all = type === "income" ? income : expense;
  const chips = [];
  for (const c of [...(frequent[type] || []), ...all]) {
    if (chips.length < 8 && !chips.some((x) => x.toLowerCase() === c.toLowerCase())) chips.push(c);
  }
  if (category && !chips.some((x) => x.toLowerCase() === category.toLowerCase())) chips.push(category);
  const others = all.filter((c) => !chips.some((x) => x.toLowerCase() === c.toLowerCase()));

  const submit = async (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (!(n > 0)) return toast.error("Enter the amount first, for example 150.");
    setSaving(true);
    try {
      await api.post(
        "/transactions",
        {
          type, amount: n, description: note.trim(), category, mood, account: account || null,
          toAccount: null, fee: 0, date: toStored(nowLocalInput()),
        },
        { successMessage: category ? undefined : "Saved to your inbox. Sort it from the Overview when you have a minute." }
      );
      if (account) { try { localStorage.setItem(LAST_KEY, account); } catch { /* storage blocked */ } }
      onSaved();
      onClose();
    } catch { /* the red message explains what to fix */ } finally {
      setSaving(false);
    }
  };

  const details = () => onMore({ type, amount, description: note, category, account, mood });

  return (
    <Modal open={open} onClose={onClose} title="Add transaction">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-2" role="group" aria-label="Type">
          {[["expense", "Expense", "border-red-600 bg-red-50 text-red-800"], ["income", "Income", "border-green-600 bg-green-50 text-green-800"]].map(([v, label, on]) => (
            <button type="button" key={v} onClick={() => pickType(v)} aria-pressed={type === v}
              className={`rounded-lg border-2 py-2 text-sm font-semibold ${type === v ? on : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}>
              {label}
            </button>
          ))}
        </div>

        <div>
          <label htmlFor={`${uid}-amount`} className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
          <div className="relative">
            <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-2xl text-slate-500">{symbol()}</span>
            <input id={`${uid}-amount`} type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} autoFocus
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-3xl font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          </div>
        </div>

        <div>
          <label htmlFor={`${uid}-note`} className="mb-1 block text-sm font-medium text-slate-700">
            What was it for? <span className="font-normal text-slate-600">(optional)</span>
          </label>
          <input id={`${uid}-note`} value={note} maxLength={200} placeholder="e.g. lunch at Jollibee" onChange={(e) => setNote(e.target.value)} className={field} />
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-slate-700" id={`${uid}-cat`}>Category</span>
            {hint && category && <span className="text-xs text-slate-600">{hint}</span>}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-labelledby={`${uid}-cat`}>
            {chips.map((c) => (
              <button type="button" key={c} onClick={() => setCategory(category === c ? "" : c)} aria-pressed={category === c}
                className={`rounded-full border px-3 py-1.5 text-sm ${category === c ? "border-indigo-600 bg-indigo-50 font-medium text-indigo-900" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
                {c}
              </button>
            ))}
          </div>
          {others.length > 0 && (
            <select aria-label="More categories" value="" onChange={(e) => e.target.value && setCategory(e.target.value)} className={`${field} mt-2`}>
              <option value="">More categories…</option>
              {others.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {!category && <p className="mt-1.5 text-xs text-slate-600">No category? It waits in your inbox on the Overview.</p>}
        </div>

        <div>
          <label htmlFor={`${uid}-acc`} className="mb-1 block text-sm font-medium text-slate-700">Account</label>
          <select id={`${uid}-acc`} value={account} onChange={(e) => setAccount(e.target.value)} className={field}>
            <option value="">{accounts.length ? "No account (balances won't change)" : "No accounts yet"}</option>
            {accounts.map((a) => <option key={a._id} value={a._id}>{a.name} · {formatMoney(a.currentBalance)}</option>)}
          </select>
        </div>

        <div>
          <span className="mb-1 block text-sm font-medium text-slate-700">How were you feeling? <span className="font-normal text-slate-600">(optional)</span></span>
          <MoodPicker value={mood} onChange={setMood} />
        </div>

        <button type="submit" disabled={saving}
          className="w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-60">
          {saving ? "Saving..." : "Add transaction"}
        </button>

        <p className="text-center text-sm text-slate-600">
          <button type="button" onClick={details} className="font-medium text-indigo-700 hover:underline">More details</button>
          {" "}(tags, receipt, notes, date) ·{" "}
          <button type="button" onClick={() => onMore({ type: "transfer", amount })} className="font-medium text-indigo-700 hover:underline">Moving money between accounts?</button>
        </p>
      </form>
    </Modal>
  );
}