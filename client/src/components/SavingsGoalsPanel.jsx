import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";

const field =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";
const blank = { name: "", target: "", deadline: "" };

function monthlyNeeded(g) {
  if (!g.deadline || g.saved >= g.target) return null;
  const days = (new Date(g.deadline) - new Date()) / 86400000;
  if (days <= 0) return null;
  return (g.target - g.saved) / Math.max(1, Math.ceil(days / 30));
}

export default function SavingsGoalsPanel() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(blank);
  const [fundsId, setFundsId] = useState(null);
  const [fundsValue, setFundsValue] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(
    () => api.get("/goals").then(({ data }) => setItems(data)).catch(() => setError("Could not load goals")),
    []
  );
  useEffect(() => { load(); }, [load]);

  const reset = () => {
    setOpen(false);
    setEditingId(null);
    setForm(blank);
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    const payload = { name: form.name, target: Number(form.target), deadline: form.deadline || null };
    try {
      if (editingId) await api.put(`/goals/${editingId}`, payload);
      else await api.post("/goals", payload);
      reset();
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  const startEdit = (g) => {
    setEditingId(g._id);
    setForm({ name: g.name, target: g.target, deadline: g.deadline ? g.deadline.slice(0, 10) : "" });
    setOpen(true);
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this goal?")) return;
    await api.delete(`/goals/${id}`);
    load();
  };

  const addFunds = async (e, id) => {
    e.preventDefault();
    setError("");
    try {
      await api.post(`/goals/${id}/funds`, { amount: Number(fundsValue) });
      setFundsId(null);
      setFundsValue("");
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Savings Goals</h3>
        {!open && (
          <button onClick={() => setOpen(true)}
            className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100">
            <Plus size={16} /> New goal
          </button>
        )}
      </div>

      {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      {open && (
        <form onSubmit={save} className="mb-4 grid gap-2 rounded-xl bg-slate-50 p-3">
          <input placeholder="Goal name (e.g. Emergency fund)" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required className={field} />
          <div className="grid gap-2 sm:grid-cols-2">
            <input type="number" min="1" step="0.01" placeholder="Target amount" value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value })} required className={field} />
            <input type="date" value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={field} />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">
              {editingId ? "Save changes" : "Create goal"}
            </button>
            <button type="button" onClick={reset} className="rounded-xl bg-slate-200 px-4 hover:bg-slate-300">Cancel</button>
          </div>
        </form>
      )}

      {items.length === 0 && !open && <p className="text-slate-500">No goals yet. Set a target and watch it fill up.</p>}

      <ul className="space-y-5">
        {items.map((g) => {
          const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
          const done = g.saved >= g.target;
          const need = monthlyNeeded(g);
          return (
            <li key={g._id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium">
                  {g.name} {done && <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Reached</span>}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => startEdit(g)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Edit goal"><Pencil size={14} /></button>
                  <button onClick={() => remove(g._id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete goal"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full ${done ? "bg-green-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-slate-600">{formatMoney(g.saved)} of {formatMoney(g.target)} ({pct}%)</span>
                {fundsId === g._id ? (
                  <form onSubmit={(e) => addFunds(e, g._id)} className="flex gap-1">
                    <input type="number" step="0.01" placeholder="Amount (- to withdraw)" value={fundsValue}
                      onChange={(e) => setFundsValue(e.target.value)} required autoFocus
                      className="w-44 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-indigo-500" />
                    <button type="submit" className="rounded-lg bg-indigo-600 px-3 text-white">OK</button>
                    <button type="button" onClick={() => { setFundsId(null); setFundsValue(""); }} className="rounded-lg bg-slate-200 px-2">×</button>
                  </form>
                ) : (
                  <button onClick={() => setFundsId(g._id)} className="font-medium text-indigo-600 hover:underline">+ Add funds</button>
                )}
              </div>
              {(g.deadline || need) && (
                <p className="mt-1 text-xs text-slate-500">
                  {g.deadline && `Due ${new Date(g.deadline).toLocaleDateString()}`}
                  {need ? ` · save about ${formatMoney(need)}/month to get there` : ""}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}