import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, WifiOff } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { monthNow, shiftMonth, monthLabel } from "../utils/months";
import useCategories from "../hooks/useCategories";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import CategoryModal from "../components/CategoryModal";
import TxIcon from "../components/TxIcon";
import Skeleton from "../components/Skeleton";

const field =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

function Stat({ label, value, color = "text-slate-900" }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 truncate text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

export default function Budgets() {
  const [month, setMonth] = useState(monthNow());
  const [budgets, setBudgets] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ category: "", limit: "" });
  const [formError, setFormError] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const { expense, reload } = useCategories();

  const load = useCallback(async () => {
    try {
      const [b, s] = await Promise.all([
        api.get("/budgets", { params: { month } }),
        api.get("/transactions/summary", { params: { month } }),
      ]);
      setBudgets(b.data);
      setSummary(s.data);
      setError("");
    } catch (err) {
      setError(err.response ? "Could not load budgets." : "Can't reach the server. Make sure it's running, then try again.");
    }
  }, [month]);
  useEffect(() => { load(); }, [load]);

  const isCurrent = month === monthNow();

  const totals = useMemo(() => {
    const limit = (budgets || []).reduce((s, b) => s + b.limit, 0);
    const spent = (budgets || []).reduce((s, b) => s + b.spent, 0);
    return { limit, spent, left: limit - spent };
  }, [budgets]);

  const unbudgeted = useMemo(() => {
    const have = new Set((budgets || []).map((b) => b.category.toLowerCase()));
    return (summary?.byCategory || [])
      .filter((c) => c._id && !have.has(c._id.toLowerCase()))
      .sort((a, b) => b.total - a.total);
  }, [budgets, summary]);

  const openAdd = (category = "") => {
    reload();
    setEditing(null);
    setForm({ category, limit: "" });
    setFormError("");
    setOpen(true);
  };
  const openEdit = (b) => {
    setEditing(b);
    setForm({ category: b.category, limit: b.limit });
    setFormError("");
    setOpen(true);
  };

  const available = expense.filter((c) => !(budgets || []).some((b) => b.category.toLowerCase() === c.toLowerCase()));
  const options = form.category && !available.includes(form.category) ? [form.category, ...available] : available;

  const handleCategory = (e) => {
    if (e.target.value === "__new__") setCatOpen(true);
    else setForm({ ...form, category: e.target.value });
  };

  const save = async (e) => {
    e.preventDefault();
    setFormError("");
    const payload = { category: form.category, limit: Number(form.limit) };
    try {
      if (editing) await api.put(`/budgets/${editing._id}`, payload);
      else await api.post("/budgets", payload);
      setOpen(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Budgets</h2>
          <p className="text-sm text-slate-500">Each limit applies to every month.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200/70">
            <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><ChevronLeft size={18} /></button>
            <span className="min-w-32 px-2 text-center text-sm font-medium">{monthLabel(month)}</span>
            <button onClick={() => setMonth(shiftMonth(month, 1))} disabled={isCurrent} aria-label="Next month" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"><ChevronRight size={18} /></button>
          </div>
          <button onClick={() => openAdd()}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700">
            <Plus size={18} /> Add budget
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-red-50 p-4 text-red-700">
          <WifiOff size={20} />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-red-100">Try again</button>
        </div>
      )}

      {!budgets && !error && (
        <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>
      )}

      {budgets && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Total budgeted" value={formatMoney(totals.limit)} />
            <Stat label="Spent so far" value={formatMoney(totals.spent)} color="text-red-600" />
            <Stat label={totals.left < 0 ? "Over by" : "Left to spend"} value={formatMoney(Math.abs(totals.left))}
              color={totals.left < 0 ? "text-red-600" : "text-green-600"} />
          </div>

          {budgets.length === 0 ? (
            <div className="mt-6 rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/60">
              <p className="text-slate-500">No budgets yet. Set a monthly limit for a category like Food & Dining.</p>
              <button onClick={() => openAdd()} className="mt-4 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700">Add your first budget</button>
            </div>
          ) : (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {budgets.map((b) => {
                const pct = Math.round((b.spent / b.limit) * 100);
                const bar = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-green-500";
                const note =
                  pct >= 100 ? `Over budget by ${formatMoney(b.spent - b.limit)}`
                  : pct >= 80 ? `Almost at your limit · ${formatMoney(b.limit - b.spent)} left`
                  : `${formatMoney(b.limit - b.spent)} left`;
                return (
                  <div key={b._id} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
                    <div className="mb-3 flex items-center gap-3">
                      <TxIcon t={{ type: "expense", category: b.category }} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{b.category}</div>
                        <div className="text-sm text-slate-500">{formatMoney(b.spent)} of {formatMoney(b.limit)}</div>
                      </div>
                      <span className={`text-lg font-semibold ${pct >= 100 ? "text-red-600" : pct >= 80 ? "text-amber-600" : "text-slate-800"}`}>{pct}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full ${bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <p className={`mt-2 text-sm ${pct >= 100 ? "text-red-600" : pct >= 80 ? "text-amber-600" : "text-slate-500"}`}>{note}</p>
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => openEdit(b)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200"><Pencil size={14} /> Edit</button>
                      <button onClick={() => setToDelete(b)} className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1 text-sm text-red-600 hover:bg-red-100"><Trash2 size={14} /> Delete</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {unbudgeted.length > 0 && (
            <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
              <h3 className="text-lg font-semibold">Spending without a budget</h3>
              <p className="mb-2 text-sm text-slate-500">{monthLabel(month)}</p>
              <ul className="divide-y divide-slate-100">
                {unbudgeted.map((c) => (
                  <li key={c._id} className="flex items-center gap-3 py-2.5">
                    <TxIcon t={{ type: "expense", category: c._id }} />
                    <span className="flex-1 font-medium">{c._id}</span>
                    <span className="font-semibold text-red-600">{formatMoney(c.total)}</span>
                    <button onClick={() => openAdd(c._id)} className="rounded-lg bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 hover:bg-indigo-100">Set budget</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit budget" : "Add budget"} closeOnEsc={!catOpen}>
        <form onSubmit={save} className="space-y-3">
          {formError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{formError}</p>}
          <label className="block text-sm font-medium text-slate-700">Category</label>
          <select value={form.category} onChange={handleCategory} required disabled={!!editing} className={field}>
            <option value="" disabled>Select category</option>
            {options.map((c) => <option key={c} value={c}>{c}</option>)}
            {!editing && <option value="__new__">+ Create category...</option>}
          </select>
          <label className="block text-sm font-medium text-slate-700">Monthly limit</label>
          <input type="number" min="1" step="0.01" placeholder="e.g. 5000" value={form.limit}
            onChange={(e) => setForm({ ...form, limit: e.target.value })} required className={field} />
          <button type="submit" className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700">
            {editing ? "Save changes" : "Add budget"}
          </button>
        </form>
      </Modal>

      <CategoryModal
        open={catOpen}
        type="expense"
        existing={expense}
        onClose={() => setCatOpen(false)}
        onCreated={(name) => { setForm((f) => ({ ...f, category: name })); reload(); }}
      />

      <ConfirmModal
        open={!!toDelete}
        message={`Delete the ${toDelete?.category} budget? Your transactions aren't affected.`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { await api.delete(`/budgets/${toDelete._id}`); load(); }}
      />
    </div>
  );
}