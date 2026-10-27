import { useEffect, useId, useRef, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Check } from "lucide-react";
import api from "../api/axios";
import useCategories from "../hooks/useCategories";
import { usePrefs } from "../context/PreferencesContext";
import { formatMoney } from "../utils/format";
import { nowLocalInput, toStored } from "../utils/datetime";
import { toast } from "../utils/toast";
import Modal from "./Modal";
import TagInput from "./TagInput";
import ReceiptField from "./ReceiptField";
import MoodPrompt from "./MoodPrompt";
import TransactionConfirmation from "./TransactionConfirmation";

const LAST_KEY = "pw_last_account";
const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const symbol = () => formatMoney(0).replace(/[\d.,\s\u00a0]/g, "");

export default function QuickAdd({ open, initial, onClose, onSaved, onMore }) {
  const uid = useId();
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState([]);
  const [receipt, setReceipt] = useState({ status: "none" });
  const [category, setCategory] = useState("");
  const [account, setAccount] = useState("");
  const [toAccount, setToAccount] = useState("");
  const [hasFee, setHasFee] = useState(false);
  const [fee, setFee] = useState("");
  const [moodPromptId, setMoodPromptId] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [hint, setHint] = useState("");
  const [saving, setSaving] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  const applyReceiptScan = (data) => {
    if (data.amount) setAmount(String(data.amount));
    if (data.description && !note) setNote(data.description);
  };
  const { expense, income, reload } = useCategories();
  const { prefs } = usePrefs();
  const defaultAccount = prefs.defaultAccount;
  const accountsRef = useRef([]);
  accountsRef.current = accounts;

  useEffect(() => {
    if (!open) return;
    setType(["income", "expense", "transfer"].includes(initial?.type) ? initial.type : "expense"); setAmount(""); setNote(""); setNotes(""); setTags([]); setReceipt({ status: "none" });
    setCategory(""); setHint(""); setAccount(""); setToAccount(""); setHasFee(false); setFee("");
    setMoreOpen(false);
    setConfirmation(null);
    reload();
    api.get("/accounts").then(({ data }) => {
      setAccounts(data);
      let last = "";
      try { last = localStorage.getItem(LAST_KEY) || ""; } catch { /* storage blocked */ }
      const pick = [last, defaultAccount].find((id) => id && data.some((a) => a._id === id));
      if (pick) setAccount(pick);
    }).catch(() => {});
  }, [open, initial, reload, defaultAccount]);

  // Suggest a category from what you typed (only fills it if you haven't chosen one)
  useEffect(() => {
    if (!open || type === "transfer") return;
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
  const typeDetails = {
    income: { hint: "Money coming in", icon: ArrowDownLeft, color: "text-emerald-600", selected: "border-emerald-200 bg-emerald-50" },
    expense: { hint: "Money going out", icon: ArrowUpRight, color: "text-rose-600", selected: "border-rose-200 bg-rose-50" },
    transfer: { hint: "Move money between accounts", icon: ArrowLeftRight, color: "text-indigo-600", selected: "border-indigo-200 bg-indigo-50" },
  };
  const moreCount = type === "transfer"
    ? (hasFee ? 1 : 0)
    : [notes.trim(), tags.length > 0 ? "tags" : "", receipt.status !== "none" ? "receipt" : ""].filter(Boolean).length;
  const submit = async (e) => {
    e.preventDefault();
    const n = Number(amount);
    if (!(n > 0)) return toast.error("Enter the amount first, for example 150.");
    if (type === "transfer" && !account) return toast.error("Choose the account the money is coming from.");
    if (type === "transfer" && !toAccount) return toast.error("Choose the account receiving the money.");
    if (type === "transfer" && account === toAccount) return toast.error("Choose two different accounts.");
    if (type === "transfer" && hasFee && !(Number(fee) > 0)) return toast.error("Enter the transfer fee amount.");
    setSaving(true);
    try {
      const res = await api.post(
        "/transactions",
        {
          type, amount: n, description: note.trim(), notes: notes.trim(), tags: type === "transfer" ? [] : tags,
          category, mood: "", account: account || null,
          splits: [],
          toAccount: type === "transfer" ? toAccount : null, fee: type === "transfer" && hasFee ? Number(fee) : 0, date: toStored(nowLocalInput()),
        },
        { successMessage: category ? undefined : "Saved to your inbox. Sort it from the Overview when you have a minute." }
      );
      if (receipt.status === "new") {
        try {
          await api.put(`/transactions/${res.data._id}/receipt`, { image: receipt.data }, { quiet: true });
        } catch {
          toast.error("The transaction was saved, but the receipt photo could not be attached. Open it again to retry.");
        }
      }
      if (account) { try { localStorage.setItem(LAST_KEY, account); } catch { /* storage blocked */ } }
      onSaved();
      setConfirmation({
        type,
        amount: n,
        category: type === "transfer" ? "" : category,
        description: note.trim(),
        date: res.data.date,
        accountName: accounts.find((item) => item._id === account)?.name,
        toAccountName: accounts.find((item) => item._id === toAccount)?.name,
        receiptAttached: receipt.status === "new",
        transactionId: res.data._id,
      });
    } catch { /* the red message explains what to fix */ } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Modal open={open && !confirmation} onClose={onClose} title="Add transaction">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-3 gap-2" role="group" aria-label="Type">
          {[["income", "Income"], ["expense", "Expense"], ["transfer", "Transfer"]].map(([v, label]) => {
            const detail = typeDetails[v];
            const Icon = detail.icon;
            return (
            <button type="button" key={v} onClick={() => pickType(v)} aria-pressed={type === v}
              className={`relative flex min-h-[72px] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-xs font-semibold transition ${type === v ? `${detail.selected} shadow-sm` : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}>
              <Icon size={20} className={type === v ? detail.color : "text-slate-400"} aria-hidden="true" />
              <span>{label}</span>
              {type === v && <Check size={13} className={`absolute ml-14 mt-[-48px] ${detail.color}`} aria-hidden="true" />}
            </button>
            );
          })}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <label htmlFor={`${uid}-amount`} className="text-sm font-semibold text-slate-800">How much?</label>
            <span className={`text-xs font-medium ${typeDetails[type].color}`}>{typeDetails[type].hint}</span>
          </div>
          <div className="relative">
            <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-2xl text-slate-500">{symbol()}</span>
            <input id={`${uid}-amount`} type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} autoFocus
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-3xl font-semibold outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
          </div>
        </div>

        <div>
          <label htmlFor={`${uid}-note`} className="mb-1 block text-sm font-medium text-slate-700">
            What was it for? <span className="font-normal text-slate-600">(description)</span>
          </label>
          <input id={`${uid}-note`} value={note} maxLength={200} placeholder="e.g. lunch at Jollibee" onChange={(e) => setNote(e.target.value)} className={field} />
          <p className="mt-1 text-xs text-slate-600">A short label that helps you recognize the transaction.</p>
        </div>

        {type !== "transfer" && <div>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium text-slate-700" id={`${uid}-cat`}>Category</span>
            {hint && category && <span className="text-xs text-slate-600">{hint}</span>}
          </div>
          <select aria-label="Category" value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
            <option value="">Select category</option>
            {all.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        
        </div>}

        {type === "transfer" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700">From account
              <select value={account} onChange={(e) => setAccount(e.target.value)} className={field} required>
                <option value="">Select account</option>
                {accounts.map((a) => <option key={a._id} value={a._id}>{a.name} · {formatMoney(a.currentBalance)}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-700">To account
              <select value={toAccount} onChange={(e) => setToAccount(e.target.value)} className={field} required>
                <option value="">Select destination</option>
                {accounts.filter((a) => a._id !== account).map((a) => <option key={a._id} value={a._id}>{a.name} · {formatMoney(a.currentBalance)}</option>)}
              </select>
            </label>
          </div>
        )}

        {type !== "transfer" && <div>
          <label htmlFor={`${uid}-acc`} className="mb-1 block text-sm font-medium text-slate-700">Account</label>
          <select id={`${uid}-acc`} value={account} onChange={(e) => setAccount(e.target.value)} className={field}>
            <option value="">{accounts.length ? "No account (balances won't change)" : "No accounts yet"}</option>
            {accounts.map((a) => <option key={a._id} value={a._id}>{a.name} · {formatMoney(a.currentBalance)}</option>)}
          </select>
        </div>}

        <button type="button" onClick={() => setMoreOpen((value) => !value)} aria-expanded={moreOpen} aria-controls={`${uid}-more-options`}
          className="flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100">
          <span className="text-left">
            <span className="block">{moreOpen ? "Hide more options" : "More options"}{moreCount > 0 && <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800">{moreCount} added</span>}</span>
            {!moreOpen && <span className="mt-0.5 block text-xs font-normal text-slate-600">{type === "transfer" ? "Add a transfer fee" : "Notes, tags, or a receipt"}</span>}
          </span>
          <span aria-hidden="true">{moreOpen ? "−" : "+"}</span>
        </button>

        {moreOpen && type === "transfer" && (
          <div id={`${uid}-more-options`} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={hasFee} onChange={(e) => setHasFee(e.target.checked)} className="h-4 w-4 accent-indigo-600" /> This transfer has a fee
            </label>
            {hasFee && <input type="number" min="0.01" step="0.01" placeholder="Transfer fee" value={fee} onChange={(e) => setFee(e.target.value)} className={field} />}
          </div>
        )}

        {moreOpen && type !== "transfer" && (
          <div id={`${uid}-more-options`} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div>
              <label htmlFor={`${uid}-notes`} className="mb-1 block text-sm font-medium text-slate-700">Note (optional)</label>
              <textarea id={`${uid}-notes`} value={notes} maxLength={500} rows={2}
                placeholder="Anything you want to remember" onChange={(e) => setNotes(e.target.value)} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Tags (optional)</label>
              <TagInput value={tags} onChange={setTags} />
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Receipt (optional)</span>
              <ReceiptField txId={null} state={receipt} onChange={setReceipt} onScan={applyReceiptScan} />
            </div>
          </div>
        )}

        <button type="submit" disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 font-semibold text-white shadow-md shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:bg-indigo-700 disabled:translate-y-0 disabled:opacity-60">
          {saving ? "Saving..." : "Add transaction"}
        </button>

      </form>
    </Modal>
    <TransactionConfirmation
      open={Boolean(confirmation)}
      transaction={confirmation}
      onDone={() => {
        const id = confirmation?.transactionId;
        const savedType = confirmation?.type;
        setConfirmation(null);
        onClose();
        if (savedType !== "transfer" && id) setTimeout(() => setMoodPromptId(id), 0);
      }}
    />
    <MoodPrompt transactionId={moodPromptId} onClose={() => { setMoodPromptId(null); onClose(); }} />
    </>
  );
}