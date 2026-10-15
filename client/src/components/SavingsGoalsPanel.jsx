import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, PiggyBank, Target, Landmark } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { nowLocalInput, toStored } from "../utils/datetime";
import Modal from "./Modal";
import ConfirmModal from "./ConfirmModal";

const field =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";
const blank = { name: "", target: "", deadline: "" };
const QUICK = [100, 500, 1000, 5000];
const LIABILITIES = ["Credit Card", "Loan"];

function monthlyNeeded(g) {
  if (!g.deadline || g.saved >= g.target) return null;
  const days = (new Date(g.deadline) - new Date()) / 86400000;
  if (days <= 0) return null;
  return (g.target - g.saved) / Math.max(1, Math.ceil(days / 30));
}

export default function SavingsGoalsPanel({ onChanged, onLoaded }) {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");

  const [goalOpen, setGoalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [formError, setFormError] = useState("");

  const [fundsGoal, setFundsGoal] = useState(null);
  const [mode, setMode] = useState("add");
  const [amount, setAmount] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [fundsAccount, setFundsAccount] = useState("");
  const [fundsError, setFundsError] = useState("");

  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(
    () => api.get("/goals").then(({ data }) => { setItems(data); onLoaded?.(data); }).catch(() => setError("Could not load goals")),
    [onLoaded]
  );
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(blank); setFormError(""); setGoalOpen(true); };
  const openEdit = (g) => {
    setEditing(g);
    setForm({ name: g.name, target: g.target, deadline: g.deadline ? g.deadline.slice(0, 10) : "" });
    setFormError("");
    setGoalOpen(true);
  };

  const saveGoal = async (e) => {
    e.preventDefault();
    setFormError("");
    const payload = { name: form.name, target: Number(form.target), deadline: form.deadline || null };
    try {
      if (editing) await api.put(`/goals/${editing._id}`, payload);
      else await api.post("/goals", payload);
      setGoalOpen(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Something went wrong");
    }
  };

  const openFunds = (g) => {
    setFundsGoal(g);
    setMode("add");
    setAmount("");
    setFundsError("");
    api.get("/accounts").then(({ data }) => {
      const own = data.filter((a) => !LIABILITIES.includes(a.type));
      setAccounts(own);
      setFundsAccount(own[0]?._id || "");
    }).catch(() => {});
  };

  const acct = accounts.find((a) => a._id === fundsAccount);
  const n = Number(amount);

  const saveFunds = async (e) => {
    e.preventDefault();
    setFundsError("");
    if (!n || n <= 0) return setFundsError("Enter an amount");
    if (mode === "add" && acct && n > acct.currentBalance)
      return setFundsError(`Not enough in ${acct.name} (${formatMoney(acct.currentBalance)} available)`);
    if (mode === "withdraw" && n > fundsGoal.saved)
      return setFundsError("You can't withdraw more than you've saved");
    try {
      await api.post(`/goals/${fundsGoal._id}/funds`, {
        amount: mode === "add" ? n : -n,
        account: fundsAccount || null,
        date: toStored(nowLocalInput()),
      });
      setFundsGoal(null);
      load();
      onChanged?.();
    } catch (err) {
      setFundsError(err.response?.data?.message || "Something went wrong");
    }
  };

  const remaining = fundsGoal ? Math.max(0, fundsGoal.target - fundsGoal.saved) : 0;
  const goalAfter = fundsGoal && n > 0 ? Math.max(0, fundsGoal.saved + (mode === "add" ? n : -n)) : null;
  const acctAfter = acct && n > 0 ? acct.currentBalance + (mode === "add" ? -n : n) : null;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold"><Target size={20} className="text-indigo-600" /> Savings Goals</h3>
        <button onClick={openNew}
          className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-100">
          <Plus size={16} /> New goal
        </button>
      </div>

      {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {items.length === 0 && <p className="text-slate-500">No goals yet. Set a target and watch it fill up.</p>}

      <ul className="space-y-5">
        {items.map((g) => {
          const raw = (g.saved / g.target) * 100;
          const pct = Math.min(100, raw);
          const pctLabel = raw > 0 && raw < 1 ? raw.toFixed(1) : Math.round(pct);
          const done = g.saved >= g.target;
          const need = monthlyNeeded(g);
          return (
            <li key={g._id}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="font-medium">
                  {g.name} {done && <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Reached</span>}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEdit(g)} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Edit goal"><Pencil size={14} /></button>
                  <button onClick={() => setToDelete(g)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete goal"><Trash2 size={14} /></button>
                </div>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full ${done ? "bg-green-500" : "bg-indigo-500"}`} style={{ width: `${raw > 0 ? Math.max(2, pct) : 0}%` }} />
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-slate-600">{formatMoney(g.saved)} of {formatMoney(g.target)} ({pctLabel}%)</span>
                <button onClick={() => openFunds(g)}
                  className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700">
                  <PiggyBank size={16} /> Add savings
                </button>
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

      <Modal open={goalOpen} onClose={() => setGoalOpen(false)} title={editing ? "Edit goal" : "New savings goal"}>
        <form onSubmit={saveGoal} className="space-y-3">
          {formError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{formError}</p>}
          <input placeholder="Goal name (e.g. Emergency fund)" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required className={field} />
          <input type="number" min="1" step="0.01" placeholder="Target amount" value={form.target}
            onChange={(e) => setForm({ ...form, target: e.target.value })} required className={field} />
          <label className="block text-sm text-slate-500">Target date (optional)</label>
          <input type="date" value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={field} />
          <button type="submit" className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700">
            {editing ? "Save changes" : "Create goal"}
          </button>
        </form>
      </Modal>

      <Modal open={!!fundsGoal} onClose={() => setFundsGoal(null)} title={fundsGoal ? `Savings: ${fundsGoal.name}` : ""} size="max-w-sm">
        {fundsGoal && (
          <form onSubmit={saveFunds} className="space-y-3">
            {fundsError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{fundsError}</p>}

            <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
              {[["add", "Add"], ["withdraw", "Withdraw"]].map(([v, label]) => (
                <button type="button" key={v} onClick={() => setMode(v)}
                  className={`rounded-lg py-2 text-sm font-medium ${mode === v ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>
                  {label}
                </button>
              ))}
            </div>

            <input type="number" min="0.01" step="0.01" placeholder="Amount" value={amount} autoFocus
              onChange={(e) => setAmount(e.target.value)} required className={`${field} text-lg`} />

            <div className="flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button type="button" key={q} onClick={() => setAmount(String(q))}
                  className="rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 hover:bg-indigo-100">
                  {formatMoney(q)}
                </button>
              ))}
              {mode === "add" && remaining > 0 && (
                <button type="button" onClick={() => setAmount(String(remaining))}
                  className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700 hover:bg-green-100">
                  Fill the rest ({formatMoney(remaining)})
                </button>
              )}
            </div>

            <div>
              <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
                <Landmark size={15} className="text-slate-400" /> {mode === "add" ? "Take from account" : "Return to account"}
              </span>
              <select value={fundsAccount} onChange={(e) => setFundsAccount(e.target.value)} className={field}>
                {accounts.map((a) => <option key={a._id} value={a._id}>{a.name} · {formatMoney(a.currentBalance)}</option>)}
                <option value="">Don't link to an account</option>
              </select>
              {accounts.length === 0 && (
                <p className="mt-1 text-xs text-amber-600">No accounts yet. Create one in the Accounts tab so savings come out of it.</p>
              )}
            </div>

            {n > 0 && (
              <div className="space-y-1 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                <div>Goal total: <span className="font-semibold text-slate-800">{formatMoney(goalAfter)}</span> of {formatMoney(fundsGoal.target)}</div>
                {acct && <div>{acct.name}: <span className="font-semibold text-slate-800">{formatMoney(acctAfter)}</span> after this</div>}
              </div>
            )}

            <button type="submit" className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700">
              {mode === "add" ? "Add to savings" : "Withdraw"}
            </button>
          </form>
        )}
      </Modal>

      <ConfirmModal
        open={!!toDelete}
        message={`Delete the goal "${toDelete?.name}"? Money already saved is not returned to your accounts, so withdraw it first if you want it back.`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { await api.delete(`/goals/${toDelete._id}`); load(); }}
      />
    </div>
  );
}