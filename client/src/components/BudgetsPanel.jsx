import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import useCategories from "../hooks/useCategories";
import Modal from "./Modal";
import ConfirmModal from "./ConfirmModal";
import CategoryModal from "./CategoryModal";

const field =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

export default function BudgetsPanel({ refreshKey = 0 }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ category: "", limit: "" });
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [catOpen, setCatOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const { expense, reload } = useCategories();

  const load = useCallback(
    () => api.get("/budgets").then(({ data }) => setItems(data)).catch(() => setError("Could not load budgets")),
    []
  );
  useEffect(() => { load(); }, [load, refreshKey]);

  const openAdd = () => {
    reload();
    setEditing(null);
    setForm({ category: "", limit: "" });
    setFormError("");
    setOpen(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({ category: b.category, limit: b.limit });
    setFormError("");
    setOpen(true);
  };

  const available = expense.filter((c) => !items.some((b) => b.category.toLowerCase() === c.toLowerCase()));
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
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Budgets</h3>
          <p className="text-xs text-slate-500"></p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100">
          <Plus size={16} /> Add budget
        </button>
      </div>

      {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {items.length === 0 && <p className="text-slate-500">No budgets yet. Add one to keep a category under control.</p>}

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
                  <button onClick={() => openEdit(b)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Edit budget"><Pencil size={14} /></button>
                  <button onClick={() => setToDelete(b)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete budget"><Trash2 size={14} /></button>
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
        message={`Delete the ${toDelete?.category} budget?`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { await api.delete(`/budgets/${toDelete._id}`); load(); }}
      />
    </div>
  );
}