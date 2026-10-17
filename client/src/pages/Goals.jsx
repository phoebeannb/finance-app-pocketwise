import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { fmtDate, fmtDateTime, nowLocalInput, toStored } from "../utils/datetime";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import Skeleton from "../components/Skeleton";
import { IconButton, Stat, TableCard, Progress, ErrorBar } from "../components/ui";

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const blank = { name: "", target: "", deadline: "" };
const QUICK = [100, 500, 1000, 5000];
const LIABILITIES = ["Credit Card", "Loan"];

const pctOf = (g) => (g.target > 0 ? (g.saved / g.target) * 100 : 0);
const pctText = (p) => (p > 0 && p < 1 ? p.toFixed(1) : Math.round(p));

function monthlyNeeded(g) {
  if (!g.deadline || g.saved >= g.target) return null;
  const days = (new Date(g.deadline) - new Date()) / 86400000;
  if (days <= 0) return null;
  return (g.target - g.saved) / Math.max(1, Math.ceil(days / 30));
}

export default function Goals() {
  const [goals, setGoals] = useState(null);
  const [activity, setActivity] = useState(null);
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

  const load = useCallback(async () => {
    try {
      const [g, a] = await Promise.all([
        api.get("/goals"),
        api.get("/transactions/search", { params: { type: "transfer", category: "Savings", pageSize: 8 } }),
      ]);
      setGoals(g.data);
      setActivity(a.data.items);
      setError("");
    } catch (err) {
      setError(err.response ? "Could not load your goals." : "Can't reach the server. Make sure it's running, then try again.");
    }
  }, []);
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
    if (mode === "withdraw" && n > fundsGoal.saved) return setFundsError("You can't withdraw more than you've saved");
    try {
      await api.post(`/goals/${fundsGoal._id}/funds`, {
        amount: mode === "add" ? n : -n,
        account: fundsAccount || null,
        date: toStored(nowLocalInput()),
      });
      setFundsGoal(null);
      load();
    } catch (err) {
      setFundsError(err.response?.data?.message || "Something went wrong");
    }
  };

  const list = goals || [];
  const saved = list.reduce((s, g) => s + g.saved, 0);
  const target = list.reduce((s, g) => s + g.target, 0);
  const reached = list.filter((g) => g.saved >= g.target).length;
  const overall = target > 0 ? Math.min(100, (saved / target) * 100) : 0;

  const remaining = fundsGoal ? Math.max(0, fundsGoal.target - fundsGoal.saved) : 0;
  const goalAfter = fundsGoal && n > 0 ? Math.max(0, fundsGoal.saved + (mode === "add" ? n : -n)) : null;
  const acctAfter = acct && n > 0 ? acct.currentBalance + (mode === "add" ? -n : n) : null;

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Goals</h2>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus size={16} /> New goal
        </button>
      </div>

      {error && <ErrorBar message={error} onRetry={load} />}
      {!goals && !error && <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>}

      {goals && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <Stat label="Saved across all goals" value={formatMoney(saved)} color="text-green-600" />
            <Stat label="Total target" value={formatMoney(target)} />
            <Stat label="Overall progress" value={`${pctText(overall)}%`} hint={`${reached} of ${list.length} goal${list.length === 1 ? "" : "s"} reached`} />
          </div>

          <TableCard>
            <table className="data-table">
              <thead>
                <tr><th>Goal</th><th className="num">Target</th><th className="num">Saved</th><th className="num">Left</th><th>Progress</th><th>Target date</th><th className="actions" /></tr>
              </thead>
              <tbody>
                {list.map((g) => {
                  const pct = pctOf(g);
                  const done = g.saved >= g.target;
                  const need = monthlyNeeded(g);
                  return (
                    <tr key={g._id}>
                      <td className="font-medium">{g.name}</td>
                      <td className="num">{formatMoney(g.target)}</td>
                      <td className="num font-semibold text-green-600">{formatMoney(g.saved)}</td>
                      <td className="num">{done ? "—" : formatMoney(g.target - g.saved)}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Progress pct={pct} color={done ? "bg-green-600" : "bg-indigo-600"} />
                          <span className="w-12 text-xs text-slate-500">{done ? "Reached" : `${pctText(pct)}%`}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        {g.deadline ? fmtDate(g.deadline) : <span className="text-slate-400">—</span>}
                        {need && <div className="text-xs text-slate-500">Save {formatMoney(need)}/month</div>}
                      </td>
                      <td className="actions">
                        <button onClick={() => openFunds(g)} className="mr-1 rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700">
                          Add savings
                        </button>
                        <IconButton icon={Pencil} label="Edit" onClick={() => openEdit(g)} />
                        <IconButton icon={Trash2} label="Delete" danger onClick={() => setToDelete(g)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {goals.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No goals yet. Set a target and start saving.{" "}
                <button onClick={openNew} className="font-medium text-indigo-600 hover:underline">Create one</button>
              </div>
            )}
          </TableCard>

          <div className="mt-8">
            <h3 className="mb-2 text-lg font-semibold">Recent Savings</h3>
            <TableCard>
              <table className="data-table">
                <thead><tr><th>Date</th><th>Description</th><th>Account</th><th className="num">Goal change</th></tr></thead>
                <tbody>
                  {(activity || []).map((t) => (
                    <tr key={t._id}>
                      <td className="whitespace-nowrap text-slate-500">{fmtDateTime(t.date)}</td>
                      <td>{t.description || "Savings"}</td>
                      <td className="text-slate-600">{(t.account || t.toAccount)?.name || "—"}</td>
                      <td className={`num font-semibold ${t.account ? "text-green-600" : "text-red-600"}`}>
                        {t.account ? "+" : "-"}{formatMoney(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {activity?.length === 0 && <p className="p-6 text-center text-slate-500">No savings yet.</p>}
            </TableCard>
          </div>
        </>
      )}

      <Modal open={goalOpen} onClose={() => setGoalOpen(false)} title={editing ? "Edit goal" : "New savings goal"}>
        <form onSubmit={saveGoal} className="space-y-3">
          {formError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{formError}</p>}
          <input placeholder="Goal name (e.g. Emergency fund)" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })} required className={field} />
          <input type="number" min="1" step="0.01" placeholder="Target amount" value={form.target}
            onChange={(e) => setForm({ ...form, target: e.target.value })} required className={field} />
          <label className="block text-sm text-slate-500">Target date (optional)</label>
          <input type="date" value={form.deadline}
            onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={field} />
          <button type="submit" className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700">
            {editing ? "Save changes" : "Create goal"}
          </button>
        </form>
      </Modal>

      <Modal open={!!fundsGoal} onClose={() => setFundsGoal(null)} title={fundsGoal ? `Savings: ${fundsGoal.name}` : ""} size="max-w-sm">
        {fundsGoal && (
          <form onSubmit={saveFunds} className="space-y-3">
            {fundsError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{fundsError}</p>}

            <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
              {[["add", "Add"], ["withdraw", "Withdraw"]].map(([v, label]) => (
                <button type="button" key={v} onClick={() => setMode(v)}
                  className={`rounded-md py-2 text-sm font-medium ${mode === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}>
                  {label}
                </button>
              ))}
            </div>

            <input type="number" min="0.01" step="0.01" placeholder="Amount" value={amount} autoFocus
              onChange={(e) => setAmount(e.target.value)} required className={`${field} text-lg`} />

            <div className="flex flex-wrap gap-2">
              {QUICK.map((q) => (
                <button type="button" key={q} onClick={() => setAmount(String(q))}
                  className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50">{formatMoney(q)}</button>
              ))}
              {mode === "add" && remaining > 0 && (
                <button type="button" onClick={() => setAmount(String(remaining))}
                  className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-50">Fill the rest ({formatMoney(remaining)})</button>
              )}
            </div>

            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">{mode === "add" ? "Take from account" : "Return to account"}</span>
              <select value={fundsAccount} onChange={(e) => setFundsAccount(e.target.value)} className={field}>
                {accounts.map((a) => <option key={a._id} value={a._id}>{a.name} · {formatMoney(a.currentBalance)}</option>)}
                <option value="">Don't link to an account</option>
              </select>
              {accounts.length === 0 && <p className="mt-1 text-xs text-amber-600">No accounts yet. Create one in the Accounts tab so savings come out of it.</p>}
            </div>

            {n > 0 && (
              <div className="space-y-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                <div>Goal total: <span className="font-semibold text-slate-900">{formatMoney(goalAfter)}</span> of {formatMoney(fundsGoal.target)}</div>
                {acct && <div>{acct.name}: <span className="font-semibold text-slate-900">{formatMoney(acctAfter)}</span> after this</div>}
              </div>
            )}

            <button type="submit" className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700">
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