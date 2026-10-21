import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Pause, Play, SkipForward } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { fmtDate } from "../utils/datetime";
import { toast } from "../utils/toast";
import useCategories from "../hooks/useCategories";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import CategoryModal from "../components/CategoryModal";
import ValueRating from "../components/ValueRating";
import Skeleton from "../components/Skeleton";
import { IconButton, Stat, TableCard, ErrorBar } from "../components/ui";

const CADENCES = [["weekly", "Every week"], ["monthly", "Every month"], ["yearly", "Every year"]];
const CAD_LABEL = { weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };

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
const when = (n) => (n <= 0 ? "due today" : n === 1 ? "tomorrow" : `in ${n} days`);
const perMonth = (i) => (i.cadence === "weekly" ? (i.amount * 52) / 12 : i.cadence === "yearly" ? i.amount / 12 : i.amount);
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const blank = () => ({ type: "expense", name: "", amount: "", category: "", account: "", cadence: "monthly", nextDate: todayYmd() });

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

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

  const sorted = useMemo(
    () => [...(items || [])].sort((a, b) => Number(b.active) - Number(a.active) || new Date(a.nextDate) - new Date(b.nextDate)),
    [items]
  );
  const active = sorted.filter((i) => i.active);
  const bills = active.filter((i) => i.type === "expense");
  const monthlyBills = bills.reduce((s, i) => s + perMonth(i), 0);
  const monthlyIncome = active.filter((i) => i.type === "income").reduce((s, i) => s + perMonth(i), 0);
  const soon = bills.filter((i) => daysUntil(i.nextDate) <= 7);
  const soonTotal = soon.reduce((s, i) => s + i.amount, 0);
  const unused = bills.filter((i) => i.valueRating === "unused");
  const unusedMonthly = unused.reduce((s, i) => s + perMonth(i), 0);

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
    try { await api.post(path); load(); } catch { /* the red message explains what went wrong */ }
  };

  // The rating changes on screen straight away, then is saved. If saving fails it is put back.
  const rate = async (item, rating) => {
    if (item.valueRating === rating) return;
    setItems((list) => list.map((x) => (x._id === item._id ? { ...x, valueRating: rating } : x)));
    try {
      await api.post(`/recurring/${item._id}/rating`, { rating }, { quiet: true });
    } catch {
      toast.error("We couldn't save that rating, so it was put back. Please try again.");
      load();
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Bills</h2>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus size={16} /> Add bill
        </button>
      </div>

      {error && <ErrorBar message={error} onRetry={load} />}
      {!items && !error && <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((k) => <Skeleton key={k} className="h-24" />)}</div>}

      {items && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Monthly Bills" value={formatMoney(monthlyBills)} color="text-red-600" hint={`${bills.length} active`} />
            <Stat label="Weekly Bills" value={formatMoney(soonTotal)} hint={plural(soon.length, "bill")} />
            <Stat label="Recurring Income" value={formatMoney(monthlyIncome)} color="text-green-600" />
            <Stat label="Marked as unused" value={formatMoney(unusedMonthly)}
              color={unusedMonthly > 0 ? "text-amber-600" : "text-slate-900"}
             />
          </div>

          {unused.length > 0 && (
            <div role="status" className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              You marked {plural(unused.length, "bill")} as unused: {unused.map((i) => i.name).join(", ")}. That's{" "}
              <b>{formatMoney(unusedMonthly)} a month</b> ({formatMoney(unusedMonthly * 12)} a year). If you're not using {unused.length === 1 ? "it" : "them"}, consider cancelling.
            </div>
          )}

          <TableCard>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th><th>Type</th><th className="num">Amount</th><th>Repeats</th><th>Next due</th><th>Account</th>
                  <th title="How much value do you get from this?">Value</th><th>Status</th><th className="actions" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((i) => {
                  const n = daysUntil(i.nextDate);
                  return (
                    <tr key={i._id} className={i.active ? "" : "text-slate-400"}>
                      <td>
                        <div className="font-medium">{i.name}</div>
                        {i.category && <div className="text-xs text-slate-500">{i.category}</div>}
                      </td>
                      <td>{i.type === "income" ? "Income" : "Bill"}</td>
                      <td className={`num font-semibold ${i.type === "income" ? "text-green-600" : ""}`}>{formatMoney(i.amount)}</td>
                      <td>{CAD_LABEL[i.cadence]}</td>
                      <td className="whitespace-nowrap">
                        {fmtDate(i.nextDate)}
                        {i.active && <span className={`ml-1 text-xs ${n <= 3 ? "font-medium text-amber-600" : "text-slate-500"}`}>({when(n)})</span>}
                      </td>
                      <td>{i.account?.name || "—"}</td>
                      <td>
                        {i.type === "expense"
                          ? <ValueRating value={i.valueRating || "neutral"} onChange={(r) => rate(i, r)} />
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td>
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${i.active ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                          {i.active ? "Active" : "Paused"}
                        </span>
                      </td>
                      <td className="actions">
                        <IconButton icon={SkipForward} label="Skip next due date" onClick={() => act(`/recurring/${i._id}/skip`)} />
                        <IconButton icon={i.active ? Pause : Play} label={i.active ? "Pause" : "Resume"} onClick={() => act(`/recurring/${i._id}/toggle`)} />
                        <IconButton icon={Pencil} label="Edit" onClick={() => openEdit(i)} />
                        <IconButton icon={Trash2} label="Delete" danger onClick={() => undoableDelete({
                        key: i._id,
                        message: `"${i.name}" deleted. Transactions it already added stay in your history.`,
                        hide: () => setItems((list) => list.filter((x) => x._id !== i._id)),
                        restore: load,
                        run: () => api.delete(`/recurring/${i._id}`, { quiet: true }),
                        done: load,
                      })} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {items.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                Nothing here yet. Add rent, Netflix, your salary, anything that repeats.{" "}
                <button onClick={openAdd} className="font-medium text-indigo-600 hover:underline">Add one</button>
              </div>
            )}
          </TableCard>
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit bill" : "Add bill"} closeOnEsc={!catOpen}>
        <form onSubmit={save} className="space-y-3">
          {formError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{formError}</p>}

          <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
            {[["expense", "Bill or subscription"], ["income", "Recurring income"]].map(([v, label]) => (
              <button type="button" key={v} onClick={() => setForm({ ...form, type: v, category: "" })}
                className={`rounded-md py-2 text-sm font-medium ${form.type === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>{label}</button>
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
                className="shrink-0 rounded-lg border border-slate-300 px-3 text-slate-600 hover:bg-slate-50"><Plus size={18} /></button>
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

          <button type="submit" className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700">
            {editing ? "Save Changes" : "Add bill"}
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
        title="Delete bill"
        message={`Are you sure you want to delete "${toDelete?.name}"? Transactions it already added will stay in your history.`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { await api.delete(`/recurring/${toDelete._id}`); load(); }}
      />
    </div>
  );
}