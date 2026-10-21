import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { fmtDate, fmtDateTime, nowLocalInput, toStored } from "../utils/datetime";
import { toast } from "../utils/toast";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import Skeleton from "../components/Skeleton";
import { IconButton, Stat, TableCard, Progress, ErrorBar } from "../components/ui";

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const LIABILITIES = ["Credit Card", "Loan"];
const blank = { name: "", target: "", deadline: "", autoPercent: "" };

const pctOf = (g) => (g.target > 0 ? (g.saved / g.target) * 100 : 0);
const pctText = (p) => (p > 0 && p < 1 ? p.toFixed(1) : Math.round(p));
const percentText = (n) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
const round2 = (n) => Math.round(n * 100) / 100;

export default function Goals() {
  const [goals, setGoals] = useState(null);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState("");

  const [goalOpen, setGoalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);

  const [wGoal, setWGoal] = useState(null);
  const [wAmount, setWAmount] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [wAccount, setWAccount] = useState("");

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

  const list = goals || [];
  const usedBy = (exceptId) => list.filter((g) => g._id !== exceptId).reduce((s, g) => s + (g.autoPercent || 0), 0);
  const usedAll = usedBy(null);
  const freeAll = Math.max(0, round2(100 - usedAll));
  const freeHere = Math.max(0, round2(100 - usedBy(editing?._id)));

  const openNew = () => {
    setEditing(null);
    setForm({ ...blank, autoPercent: String(Math.min(10, freeAll)) });
    setGoalOpen(true);
  };
  const openEdit = (g) => {
    setEditing(g);
    setForm({ name: g.name, target: g.target, deadline: g.deadline ? g.deadline.slice(0, 10) : "", autoPercent: String(g.autoPercent || 0) });
    setGoalOpen(true);
  };

  const saveGoal = async (e) => {
    e.preventDefault();
    const payload = { name: form.name, target: Number(form.target), deadline: form.deadline || null, autoPercent: Number(form.autoPercent) || 0 };
    try {
      if (editing) await api.put(`/goals/${editing._id}`, payload);
      else await api.post("/goals", payload);
      setGoalOpen(false);
      load();
    } catch { /* the red message explains what to fix */ }
  };

  const openWithdraw = (g) => {
    setWGoal(g);
    setWAmount("");
    api.get("/accounts").then(({ data }) => {
      const own = data.filter((a) => !LIABILITIES.includes(a.type));
      setAccounts(own);
      setWAccount(own[0]?._id || "");
    }).catch(() => {});
  };

  const saveWithdraw = async (e) => {
    e.preventDefault();
    const n = Number(wAmount);
    if (!(n > 0)) return toast.error("Enter the amount you want to withdraw.");
    if (n > wGoal.saved) return toast.error(`You can only withdraw up to ${formatMoney(wGoal.saved)} from this goal.`);
    if (!wAccount) return toast.error("Choose the account that receives the money. Create one in the Accounts tab if you have none.");
    try {
      await api.post(`/goals/${wGoal._id}/funds`, { amount: -n, account: wAccount, date: toStored(nowLocalInput()) });
      setWGoal(null);
      load();
    } catch { /* the red message explains what to fix */ }
  };

  const saved = list.reduce((s, g) => s + g.saved, 0);
  const target = list.reduce((s, g) => s + g.target, 0);
  const reached = list.filter((g) => g.saved >= g.target).length;
  const overall = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
  const acct = accounts.find((a) => a._id === wAccount);
  const wn = Number(wAmount);

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Goals</h2>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus size={16} /> New Goal
        </button>
      </div>

      {error && <ErrorBar message={error} onRetry={load} />}
      {!goals && !error && <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>}

      {goals && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Total Saved" value={formatMoney(saved)} color="text-green-600" />
            <Stat label="Total Target" value={formatMoney(target)} />
            <Stat label="Overall Progress" value={`${pctText(overall)}%`} hint={`${reached} of ${list.length} goal${list.length === 1 ? "" : "s"} reached`} />
            <Stat label="Auto-save" value={`${percentText(usedAll)} of income`} hint={`${percentText(freeAll)} not allocated`} />
          </div>

          <TableCard>
            <table className="data-table">
              <thead>
                <tr><th>Goal</th><th className="num">Target</th><th className="num">Saved</th><th className="num">Left</th><th>Progress</th><th>Auto-save</th><th>Target date</th><th className="actions" /></tr>
              </thead>
              <tbody>
                {list.map((g) => {
                  const pct = pctOf(g);
                  const done = g.saved >= g.target;
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
                      <td className="whitespace-nowrap">{g.autoPercent > 0 ? `${percentText(g.autoPercent)} of income` : <span className="text-slate-400">Off</span>}</td>
                      <td className="whitespace-nowrap">{g.deadline ? fmtDate(g.deadline) : <span className="text-slate-400">—</span>}</td>
                      <td className="actions">
                        {g.saved > 0 && (
                          <button onClick={() => openWithdraw(g)} className="mr-1 rounded-md border border-slate-300 px-3 py-1 text-sm font-medium hover:bg-slate-50">Withdraw</button>
                        )}
                        <IconButton icon={Pencil} label="Edit" onClick={() => openEdit(g)} />
                        <IconButton icon={Trash2} label="Delete" danger onClick={() => undoableDelete({
                        key: g._id,
                        message: `Goal "${g.name}" deleted.${g.saved > 0 ? " Its savings go back to your accounts." : ""}`,
                        hide: () => setGoals((list) => list.filter((x) => x._id !== g._id)),
                        restore: load,
                        run: () => api.delete(`/goals/${g._id}`, { quiet: true }),
                        done: load,
                      })} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {goals.length === 0 && (
              <div className="p-6 text-center text-slate-500">
                No goals yet. Set a target and decide how much of each income goes into it.{" "}
                <button onClick={openNew} className="font-medium text-indigo-600 hover:underline">Create one</button>
              </div>
            )}
          </TableCard>

          <div className="mt-8">
            <h3 className="mb-2 text-lg font-semibold">Recent Savings</h3>
            <TableCard>
              <table className="data-table">
                <thead><tr><th>Date</th><th>Description</th><th>Account</th><th className="num">Goal Change</th></tr></thead>
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
              {activity?.length === 0 && <p className="p-6 text-center text-slate-500">Nothing yet. Savings appear here the next time you add income to a bank account.</p>}
            </TableCard>
          </div>
        </>
      )}

      <Modal open={goalOpen} onClose={() => setGoalOpen(false)} title={editing ? "Edit goal" : "New Savings Goal"}>
        <form onSubmit={saveGoal} className="space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Goal Name</label>
            <input placeholder="e.g. Emergency fund" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={field} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Target Amount</label>
            <input type="number" min="1" step="0.01" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} required className={field} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Auto-save (% of every income)</label>
            <input type="number" min="0" max="100" step="0.5" value={form.autoPercent} onChange={(e) => setForm({ ...form, autoPercent: e.target.value })} className={field} />
            <p className="mt-1 text-xs text-slate-500">
              {Number(form.autoPercent) > 0
                ? `On a ${formatMoney(10000)} income, ${formatMoney((10000 * Number(form.autoPercent)) / 100)} moves into this goal. `
                : "Set 0 to turn auto-save off for this goal. "}
              You can use up to {percentText(freeHere)} here.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Target date (optional)</label>
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={field} />
          </div>
          <button type="submit" className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700">
            {editing ? "Save Changes" : "Create goal"}
          </button>
        </form>
      </Modal>

      <Modal open={!!wGoal} onClose={() => setWGoal(null)} title={wGoal ? `Withdraw from ${wGoal.name}` : ""} size="max-w-sm">
        {wGoal && (
          <form onSubmit={saveWithdraw} className="space-y-3">
            <p className="text-sm text-slate-600">Saved so far: <span className="font-semibold text-slate-900">{formatMoney(wGoal.saved)}</span></p>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
              <div className="flex gap-2">
                <input type="number" min="0.01" step="0.01" value={wAmount} autoFocus onChange={(e) => setWAmount(e.target.value)} required className={`${field} min-w-0`} />
                <button type="button" onClick={() => setWAmount(String(wGoal.saved))} className="shrink-0 rounded-lg border border-slate-300 px-3 text-sm hover:bg-slate-50">All</button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Send the money to</label>
              <select value={wAccount} onChange={(e) => setWAccount(e.target.value)} className={field}>
                {accounts.map((a) => <option key={a._id} value={a._id}>{a.name} · {formatMoney(a.currentBalance)}</option>)}
              </select>
            </div>
            {wn > 0 && acct && (
              <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                {acct.name} will have <span className="font-semibold text-slate-900">{formatMoney(acct.currentBalance + wn)}</span>.
              </p>
            )}
            <button type="submit" className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700">Withdraw</button>
          </form>
        )}
      </Modal>

      <ConfirmModal
        open={!!toDelete}
        message={`Are you sure you want to delete the goal "${toDelete?.name}"? ${toDelete?.saved > 0 ? `The ${formatMoney(toDelete.saved)} saved will go back to the accounts it came from.` : "Nothing has been saved in it yet."}`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { await api.delete(`/goals/${toDelete._id}`); load(); }}
      />
    </div>
  );
}