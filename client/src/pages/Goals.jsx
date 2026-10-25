import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Target, X } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { fmtDate, relativeDay } from "../utils/datetime";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import Ring from "../components/Ring";
import Skeleton from "../components/Skeleton";
import { IconButton, Stat, Empty, ErrorBar, card } from "../components/ui";

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const blank = { name: "", target: "", deadline: "", autoPercent: "" };
const CELEB_KEY = "pw_goals_celebrated";

const pctOf = (g) => (g.target > 0 ? (g.saved / g.target) * 100 : 0);
const percentText = (n) => `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
const round2 = (n) => Math.round(n * 100) / 100;
const readCelebrated = () => { try { return JSON.parse(localStorage.getItem(CELEB_KEY)) || []; } catch { return []; } };

export default function Goals() {
  const [goals, setGoals] = useState(null);
  const [activity, setActivity] = useState(null);
  const [error, setError] = useState("");
  const [celebrated, setCelebrated] = useState(readCelebrated);

  const [goalOpen, setGoalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(blank);
  const [deleting, setDeleting] = useState(null);

  const load = useCallback(async () => {
    try {
      const [g, a] = await Promise.all([
        api.get("/goals"),
        api.get("/transactions/search", { params: { type: "transfer", category: "Savings", pageSize: 6 } }),
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

  const fresh = list.filter((g) => g.saved >= g.target && !celebrated.includes(g._id));
  const dismissCelebration = (id) => {
    const next = [...celebrated, id];
    setCelebrated(next);
    try { localStorage.setItem(CELEB_KEY, JSON.stringify(next)); } catch { /* storage blocked */ }
  };

  const openNew = () => { setEditing(null); setForm({ ...blank }); setGoalOpen(true); };
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

  const remove = async () => {
    await api.delete(`/goals/${deleting._id}`, { quiet: true });
    setDeleting(null);
    load();
  };

  const saved = list.reduce((s, g) => s + g.saved, 0);
  const target = list.reduce((s, g) => s + g.target, 0);
  const reached = list.filter((g) => g.saved >= g.target).length;
  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div>
            <h2 className="text-2xl font-semibold">Goals</h2>
          </div>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus size={16} aria-hidden="true" /> New goal
        </button>
      </div>

      {error && <ErrorBar message={error} onRetry={load} />}

      {fresh.map((g) => (
        <div key={g._id} role="status" className="mb-4 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-900">
          <span aria-hidden="true" className="text-xl">🎉</span>
          <p className="flex-1 text-sm"><b>You reached your goal "{g.name}"!</b> You saved {formatMoney(g.saved)}. That's worth celebrating.</p>
          <button onClick={() => dismissCelebration(g._id)} aria-label={`Dismiss the ${g.name} message`} className="rounded p-0.5 hover:bg-green-100"><X size={16} aria-hidden="true" /></button>
        </div>
      ))}

      {!goals && !error && <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-56" />)}</div>}

      {goals && goals.length === 0 && (
        <Empty icon={Target} title="No goals yet"
          action={<button onClick={openNew} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Create your first goal</button>}>
          Pick something to save for, like an emergency fund or a trip, and decide how much of each income goes toward it.
        </Empty>
      )}

      {goals && goals.length > 0 && (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label="Saved across all goals" value={formatMoney(saved)} color="text-green-700" />
            <Stat label="Total target" value={formatMoney(target)} />
            <Stat label="Goals reached" value={`${reached} of ${list.length}`} />
            <Stat label="Auto-save" value={`${percentText(usedAll)} of income`} hint={`${percentText(freeAll)} not allocated yet`} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((g) => {
              const pct = pctOf(g);
              const done = g.saved >= g.target;
              return (
                <article key={g._id} className={`${card} flex flex-col p-4 ${done && !celebrated.includes(g._id) ? "celebrate" : ""}`}>
                  <div className="flex items-center gap-4">
                    <Ring pct={pct} done={done} label={`${g.name}: ${Math.round(pct)} percent saved`} />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-semibold text-slate-900">{g.name}</h3>
                      <p className="text-sm text-slate-600">Target {formatMoney(g.target)}</p>
                      {g.deadline && <p className="text-sm text-slate-600">By {fmtDate(g.deadline)}</p>}
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">Saved</dt>
                      <dd className="text-xl font-semibold text-green-700">{formatMoney(g.saved)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">{done ? "Status" : "Still to go"}</dt>
                      <dd className="text-xl font-semibold text-slate-900">{done ? "Reached" : formatMoney(g.target - g.saved)}</dd>
                    </div>
                  </dl>

                  <p className={`mt-3 rounded-lg px-3 py-2 text-sm ${g.autoPercent > 0 ? "bg-slate-50 text-slate-700" : "bg-amber-50 text-amber-900"}`}>
                    {g.autoPercent > 0
                      ? `${percentText(g.autoPercent)} of every income goes here automatically.`
                      : "Auto-save is off. You can add money to this goal when recording income."}
                  </p>

                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <div className="flex">
                      <IconButton icon={Pencil} label="Edit" onClick={() => openEdit(g)} />
                      <IconButton icon={Trash2} label="Delete" danger onClick={() => setDeleting(g)} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <section className="mt-8" aria-labelledby="goal-activity">
            <h3 id="goal-activity" className="mb-2 px-1 text-base font-semibold">Recent savings activity</h3>
            {activity?.length === 0 ? (
              <p className="px-1 text-slate-600">Nothing yet. Savings appear here when you add income and choose a goal, or when automatic saving runs.</p>
            ) : (
              <ul className={`${card} divide-y divide-slate-100`}>
                {(activity || []).map((t) => (
                  <li key={t._id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{t.description || "Savings"}</div>
                      <div className="text-xs text-slate-600">{relativeDay(t.date)} · {(t.account || t.toAccount)?.name || "No account"}</div>
                    </div>
                    <div className={`font-semibold ${t.account ? "text-green-700" : "text-red-700"}`}>{t.account ? "+" : "-"}{formatMoney(t.amount)}</div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <Modal open={goalOpen} onClose={() => setGoalOpen(false)} title={editing ? "Edit goal" : "New savings goal"}>
        <form onSubmit={saveGoal} className="space-y-3">
          <div>
            <label htmlFor="g-name" className="mb-1 block text-sm font-medium text-slate-700">Goal name</label>
            <input id="g-name" placeholder="e.g. Emergency fund" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className={field} />
          </div>
          <div>
            <label htmlFor="g-target" className="mb-1 block text-sm font-medium text-slate-700">Target amount</label>
            <input id="g-target" type="number" min="1" step="0.01" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} required className={field} />
          </div>
          <div>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={Number(form.autoPercent) > 0} onChange={(e) => setForm({ ...form, autoPercent: e.target.checked ? "10" : "" })} className="h-4 w-4 accent-indigo-600" />
              Automatically save part of every income (optional)
            </label>
            {Number(form.autoPercent) > 0 && (
              <div className="mt-2">
                <label htmlFor="g-auto" className="mb-1 block text-xs font-medium text-slate-600">Percentage</label>
                <input id="g-auto" type="number" min="0.5" max="100" step="0.5" value={form.autoPercent} onChange={(e) => setForm({ ...form, autoPercent: e.target.value })} className={field} />
              </div>
            )}
            <p className="mt-1 text-xs text-slate-600">
              {Number(form.autoPercent) > 0
                ? `On a ${formatMoney(10000)} income, ${formatMoney((10000 * Number(form.autoPercent)) / 100)} moves into this goal. `
                : "Leave this empty if you only want to add money manually when recording income. "}
              You can use up to {percentText(freeHere)} here.
            </p>
          </div>
          <div>
            <label htmlFor="g-date" className="mb-1 block text-sm font-medium text-slate-700">Target date (optional)</label>
            <input id="g-date" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className={field} />
          </div>
          <button type="submit" className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700">
            {editing ? "Save changes" : "Create goal"}
          </button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleting}
        title="Delete this goal?"
        message={deleting ? `“${deleting.name}” and its saved amount will be deleted. This cannot be undone.` : ""}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
      />
    </div>
  );
}