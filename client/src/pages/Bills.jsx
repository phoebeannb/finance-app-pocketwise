import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Pause, Play, SkipForward, WifiOff } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { fmtDate } from "../utils/datetime";
import useCategories from "../hooks/useCategories";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import CategoryModal from "../components/CategoryModal";
import TxIcon from "../components/TxIcon";
import Skeleton from "../components/Skeleton";

const CADENCES = [["weekly", "Every week"], ["monthly", "Every month"], ["yearly", "Every year"]];
const CAD_WORD = { weekly: "week", monthly: "month", yearly: "year" };

const pad = (n) => String(n).padStart(2, "0");
const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
const daysUntil = (iso) => {
  const d = new Date();
  const today = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((new Date(iso).getTime() - today) / 86400000);
};
const when = (n) => (n <= 0 ? "Due today" : n === 1 ? "Tomorrow" : `In ${n} days`);
const perMonth = (i) => (i.cadence === "weekly" ? (i.amount * 52) / 12 : i.cadence === "yearly" ? i.amount / 12 : i.amount);
const blank = () => ({ type: "expense", name: "", amount: "", category: "", account: "", cadence: "monthly", nextDate: todayYmd() });

const field =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

function Stat({ label, value, hint, color = "text-slate-900" }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 truncate text-2xl font-semibold ${color}`}>{value}</div>
      {hint && <div className="text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export default function Bills() {
  const [items, setItems] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank());
  const [formError, setFormError] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const { expense, income, reload } = useCategories();

  const load = useCallback(async () => {
    try {
      const [r, a] = await Promise.all([api.get("/recurring"), api.get("/accounts")]);
      setItems(r.data);
      setAccounts(a.data);
      setError("");
    } catch (err) {
      setError(err.response ? "Could not load your bills." : "Can't reach the server. Make sure it's running, then try again.");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const active = useMemo(() => (items || []).filter((i) => i.active), [items]);
  const paused = useMemo(() => (items || []).filter((i) => !i.active), [items]);
  const bills = active.filter((i) => i.type === "expense");
  const monthlyBills = bills.reduce((s, i) => s + perMonth(i), 0);
  const monthlyIncome = active.filter((i) => i.type === "income").reduce((s, i) => s + perMonth(i), 0);
  const soon = bills.filter((i) => daysUntil(i.nextDate) <= 7);
  const soonTotal = soon.reduce((s, i) => s + i.amount, 0);

  const baseCats = form.type === "income" ? income : expense;
  const cats = form.category && !baseCats.some((c) => c.toLowerCase() === form.category.toLowerCase())
    ? [form.category, ...baseCats] : baseCats;

  const openAdd = () => { reload(); setEditing(null); setForm(blank()); setFormError(""); setOpen(true); };
  const openEdit = (i) => {
    reload();
    setEditing(i);
    setForm({
      type: i.type, name: i.name, amount: i.amount, category: i.category || "",
      account: i.account?._id || "", cadence: i.cadence, nextDate: i.nextDate.slice(0, 10),
    });
    setFormError("");
    setOpen(true);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setFormError("");
    const payload = { ...form, amount: Number(form.amount), account: form.account || null };
    try {
      if (editing) await api.put(`/recurring/${editing._id}`, payload);
      else await api.post("/recurring", payload);
      setOpen(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Something went wrong");
    }
  };

  const act = async (path) => {
    try { await api.post(path); load(); } catch { setError("That didn't work. Please try again."); }
  };

  const Row = ({ i }) => {
    const n = daysUntil(i.nextDate);
    return (
      <li className={`flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between ${i.active ? "" : "opacity-60"}`}>
        <div className="flex min-w-0 items-center gap-3">
          <TxIcon t={{ type: i.type, category: i.category }} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 font-medium">
              {i.name}
              {i.type === "income" && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Income</span>}
            </div>
            <div className="truncate text-sm text-slate-500">
              {formatMoney(i.amount)} every {CAD_WORD[i.cadence]}
              {i.account?.name ? ` · ${i.account.name}` : ""}
              {" · "}{i.active ? `Next: ${fmtDate(i.nextDate)} (${when(n)})` : "Paused"}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => act(`/recurring/${i._id}/skip`)} title="Skip the next due date"
            className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200"><SkipForward size={14} /> Skip next</button>
          <button onClick={() => act(`/recurring/${i._id}/toggle`)}
            className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200">
            {i.active ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Resume</>}
          </button>
          <button onClick={() => openEdit(i)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200"><Pencil size={14} /> Edit</button>
          <button onClick={() => setToDelete(i)} className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1 text-sm text-red-600 hover:bg-red-100"><Trash2 size={14} /> Delete</button>
        </div>
      </li>
    );
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Bills & Subscriptions</h2>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700">
          <Plus size={18} /> Add bill
        </button>
      </div>

      {error && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-red-50 p-4 text-red-700">
          <WifiOff size={20} />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-red-100">Try again</button>
        </div>
      )}

      {!items && !error && <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((k) => <Skeleton key={k} className="h-24" />)}</div>}

      {items && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Monthly Expenses" value={formatMoney(monthlyBills)} color="text-red-600" hint={`${bills.length} active`} />
            <Stat label="Upcoming Payments" value={formatMoney(soonTotal)} hint={`${soon.length} bill${soon.length === 1 ? "" : "s"}`} />
            <Stat label="Monthly Revenue" value={formatMoney(monthlyIncome)} color="text-green-600" />
          </div>

          {items.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/60">
              <p className="text-slate-500">Nothing here yet. Add rent, Netflix, your salary, anything that repeats.</p>
              <button onClick={openAdd} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700">Add your first one</button>
            </div>
          ) : (
            <>
              <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
                <h3 className="text-lg font-semibold">Upcoming</h3>
                {active.length === 0 ? <p className="mt-2 text-slate-500">Everything is paused.</p> : (
                  <ul className="divide-y divide-slate-100">{active.map((i) => <Row key={i._id} i={i} />)}</ul>
                )}
              </div>
              {paused.length > 0 && (
                <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
                  <h3 className="text-lg font-semibold">Paused</h3>
                  <ul className="divide-y divide-slate-100">{paused.map((i) => <Row key={i._id} i={i} />)}</ul>
                </div>
              )}
            </>
          )}
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit bill" : "Add bill"} closeOnEsc={!catOpen}>
        <form onSubmit={save} className="space-y-3">
          {formError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{formError}</p>}

          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
            {[["expense", "Bill or subscription"], ["income", "Recurring income"]].map(([v, label]) => (
              <button type="button" key={v} onClick={() => setForm({ ...form, type: v, category: "" })}
                className={`rounded-lg py-2 text-sm font-medium ${form.type === v ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>{label}</button>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input name="name" placeholder={form.type === "income" ? "e.g. Salary" : "e.g. Netflix, Rent, Meralco"} value={form.name}
              onChange={handleChange} required maxLength={60} className={field} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
            <input name="amount" type="number" step="0.01" min="0.01" placeholder="0.00" value={form.amount}
              onChange={handleChange} required className={field} />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <div className="flex gap-2">
              <select name="category" value={form.category} onChange={handleChange} required className={`${field} min-w-0`}>
                <option value="" disabled>Select category</option>
                {cats.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <button type="button" onClick={() => setCatOpen(true)} aria-label="Add category"
                className="shrink-0 rounded-xl bg-indigo-50 px-3 text-indigo-600 hover:bg-indigo-100"><Plus size={18} /></button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Account</label>
            <select name="account" value={form.account} onChange={handleChange} className={field}>
              <option value="">No account (don't change a balance)</option>
              {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Repeats</label>
              <select name="cadence" value={form.cadence} onChange={handleChange} className={field}>
                {CADENCES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Next due date</label>
              <input name="nextDate" type="date" value={form.nextDate} onChange={handleChange} required className={field} />
            </div>
          </div>

          <button type="submit" className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700">
            {editing ? "Save changes" : "Add bill"}
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

      <ConfirmModal
        open={!!toDelete}
        message={`Delete "${toDelete?.name}"? Transactions it already added stay in your history.`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { await api.delete(`/recurring/${toDelete._id}`); load(); }}
      />
    </div>
  );
}