import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { EXPENSE_CATEGORIES } from "../utils/categories";

const field =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

export default function BudgetsPanel({ refreshKey = 0 }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ category: "", limit: "" });
  const [error, setError] = useState("");

  const load = useCallback(
    () => api.get("/budgets").then(({ data }) => setItems(data)).catch(() => setError("Could not load budgets")),
    []
  );
  useEffect(() => { load(); }, [load, refreshKey]);

  const reset = () => {
    setOpen(false);
    setEditingId(null);
    setForm({ category: "", limit: "" });
  };

  const available = EXPENSE_CATEGORIES.filter(
    (c) => editingId || !items.some((b) => b.category.toLowerCase() === c.toLowerCase())
  );

  const save = async (e) => {
    e.preventDefault();
    setError("");
    const payload = { category: form.category, limit: Number(form.limit) };
    try {
      if (editingId) await api.put(`/budgets/${editingId}`, payload);
      else await api.post("/budgets", payload);
      reset();
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  const startEdit = (b) => {
    setEditingId(b._id);
    setForm({ category: b.category, limit: b.limit });
    setOpen(true);
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this budget?")) return;
    await api.delete(`/budgets/${id}`);
    load();
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Budgets</h3>
          <p className="text-xs text-slate-500">Monthly limits, reset on the 1st</p>
        </div>
        {!open && (
          <button onClick={() => setOpen(true)} disabled={available.length === 0 && !editingId}
            className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100 disabled:opacity-50">
            <Plus size={16} /> Add budget
          </button>
        )}
      </div>

      {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {open && (
        <form onSubmit={save} className="mb-4 grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto]">
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            required disabled={!!editingId} className={field}>
            <option value="" disabled>Category</option>
            {available.map((c) => <option key={c} value={c}>{c}</option>)}
            {editingId && <option value={form.category}>{form.category}</option>}
          </select>
          <input type="number" min="1" step="0.01" placeholder="Monthly limit" value={form.limit}
            onChange={(e) => setForm({ ...form, limit: e.target.value })} required className={field} />
          <div className="flex gap-2">
            <button type="submit" className="rounded-xl bg-indigo-600 px-4 font-semibold text-white hover:bg-indigo-700">Save</button>
            <button type="button" onClick={reset} className="rounded-xl bg-slate-200 px-4 hover:bg-slate-300">Cancel</button>
          </div>
        </form>
      )}

      {items.length === 0 && !open && <p className="text-slate-500">No budgets yet. Add one to keep a category under control.</p>}

      <ul className="space-y-4">
        {items.map((b) => {
          const pct = Math.round((b.spent / b.limit) * 100);
          const bar = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-amber-500" : "bg-green-500";
          const note =
            pct >= 100 ? `Over budget by ${formatMoney(b.spent - b.limit)}`
            : pct >= 80 ? "Almost at your limit"
            : `${formatMoney(b.limit - b.spent)} left`;
          return (
            <li key={b._id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium">{b.category}</span>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-slate-500">{formatMoney(b.spent)} / {formatMoney(b.limit)}</span>
                  <button onClick={() => startEdit(b)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Edit budget"><Pencil size={14} /></button>
                  <button onClick={() => remove(b._id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete budget"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full ${bar}`} style={{ width: `${Math.min(100, pct)}%` }} />
              </div>
              <p className={`mt-1 text-xs ${pct >= 100 ? "text-red-600" : pct >= 80 ? "text-amber-600" : "text-slate-500"}`}>{note}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}