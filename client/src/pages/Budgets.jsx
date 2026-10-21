import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { monthNow, shiftMonth, monthLabel } from "../utils/months";
import useCategories from "../hooks/useCategories";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import CategoryModal from "../components/CategoryModal";
import Skeleton from "../components/Skeleton";
import { IconButton, Stat, TableCard, Progress, ErrorBar } from "../components/ui";

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

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

  const openAdd = (category = "") => { reload(); setEditing(null); setForm({ category, limit: "" }); setFormError(""); setOpen(true); };
  const openEdit = (b) => { setEditing(b); setForm({ category: b.category, limit: b.limit }); setFormError(""); setOpen(true); };

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
          <h2 className="text-2xl font-semibold">Budgets</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
            <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><ChevronLeft size={18} /></button>
            <span className="min-w-32 px-2 text-center text-sm font-medium">{monthLabel(month)}</span>
            <button onClick={() => setMonth(shiftMonth(month, 1))} disabled={isCurrent} aria-label="Next month" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"><ChevronRight size={18} /></button>
          </div>
          <button onClick={() => openAdd()}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus size={16} /> Add budget
          </button>
        </div>
      </div>

      {error && <ErrorBar message={error} onRetry={load} />}
      {!budgets && !error && <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>}

      {budgets && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Budget" value={formatMoney(totals.limit)} />
            <Stat label="Spent on budgeted " value={formatMoney(totals.spent)} color="text-red-600" />
            <Stat label="Spending without a budget" value={formatMoney(unbudgeted.reduce((s, c) => s + c.total, 0))}
            color="text-amber-600" />
            <Stat label={totals.left < 0 ? "Over by" : "Remaining"} value={formatMoney(Math.abs(totals.left))}
              color={totals.left < 0 ? "text-red-600" : "text-green-600"} />
          </div>

          <TableCard>
            <table className="data-table">
              <thead>
                <tr><th>Category</th><th className="num">Limit</th><th className="num">Spent</th><th className="num">Left</th><th>Progress</th><th className="actions" /></tr>
              </thead>
              <tbody>
                {budgets.map((b) => {
                  const pct = Math.round((b.spent / b.limit) * 100);
                  const bar = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-green-600";
                  const left = b.limit - b.spent;
                  return (
                    <tr key={b._id}>
                      <td className="font-medium">{b.category}</td>
                      <td className="num">{formatMoney(b.limit)}</td>
                      <td className="num">{formatMoney(b.spent)}</td>
                      <td className={`num font-medium ${left < 0 ? "text-red-600" : "text-slate-700"}`}>
                        {left < 0 ? `-${formatMoney(-left)}` : formatMoney(left)}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Progress pct={pct} color={bar} />
                          <span className={`w-10 text-xs ${pct >= 100 ? "text-red-600" : pct >= 80 ? "text-amber-600" : "text-slate-500"}`}>{pct}%</span>
                        </div>
                      </td>
                      <td className="actions">
                        <IconButton icon={Pencil} label="Edit" onClick={() => openEdit(b)} />
                        <IconButton icon={Trash2} label="Delete" danger onClick={() => undoableDelete({
                        key: b._id,
                        message: `Budget for ${b.category} deleted.`,
                        hide: () => setBudgets((list) => list.filter((x) => x._id !== b._id)),
                        restore: load,
                        run: () => api.delete(`/budgets/${b._id}`, { quiet: true }),
                        done: load,
                      })} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {budgets.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No budgets yet. Set a monthly limit for a category like Food & Dining.{" "}
                <button onClick={() => openAdd()} className="font-medium text-indigo-600 hover:underline">Add one</button>
              </div>
            )}
          </TableCard>

          {unbudgeted.length > 0 && (
            <div className="mt-8">
              <h3 className="mb-2 text-lg font-semibold">Unbudgeted Spending</h3>
              <TableCard>
                <table className="data-table">
                  <thead><tr><th>Category</th><th className="num">Spent in {monthLabel(month)}</th><th className="actions" /></tr></thead>
                  <tbody>
                    {unbudgeted.map((c) => (
                      <tr key={c._id}>
                        <td className="font-medium">{c._id}</td>
                        <td className="num font-semibold text-red-600">{formatMoney(c.total)}</td>
                        <td className="actions">
                          <button onClick={() => openAdd(c._id)} className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium hover:bg-slate-50">Set budget</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
            </div>
          )}
        </>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit budget" : "Add budget"} closeOnEsc={!catOpen}>
        <form onSubmit={save} className="space-y-3">
          {formError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{formError}</p>}
          <label className="block text-sm font-medium text-slate-700">Category</label>
          <select value={form.category} onChange={handleCategory} required disabled={!!editing} className={field}>
            <option value="" disabled>Select category</option>
            {options.map((c) => <option key={c} value={c}>{c}</option>)}
            {!editing && <option value="__new__">+ Create category...</option>}
          </select>
          <label className="block text-sm font-medium text-slate-700">Monthly limit</label>
          <input type="number" min="1" step="0.01" placeholder="e.g. 5000" value={form.limit}
            onChange={(e) => setForm({ ...form, limit: e.target.value })} required className={field} />
          <button type="submit" className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700">
            {editing ? "Save Changes" : "Add budget"}
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