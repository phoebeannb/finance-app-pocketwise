import { useCallback, useEffect, useState } from "react";
import { Target } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { txTitle, txSubtitle } from "../utils/txDisplay";
import SavingsGoalsPanel from "../components/SavingsGoalsPanel";
import TxIcon from "../components/TxIcon";

function Stat({ label, value, color = "text-slate-900" }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 truncate text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

export default function Goals() {
  const [goals, setGoals] = useState(null);
  const [activity, setActivity] = useState(null);

  const loadActivity = useCallback(
    () => api.get("/transactions/search", { params: { type: "transfer", category: "Savings", pageSize: 8 } })
      .then(({ data }) => setActivity(data.items))
      .catch(() => setActivity([])),
    []
  );
  useEffect(() => { loadActivity(); }, [loadActivity]);

  const saved = (goals || []).reduce((s, g) => s + g.saved, 0);
  const target = (goals || []).reduce((s, g) => s + g.target, 0);
  const reached = (goals || []).filter((g) => g.saved >= g.target).length;
  const overall = target > 0 ? Math.min(100, (saved / target) * 100) : 0;

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Goals</h2>
        <p className="text-sm text-slate-500">Adding savings moves money out of your account, so your balances always match.</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Saved across all goals" value={formatMoney(saved)} color="text-green-600" />
        <Stat label="Total target" value={formatMoney(target)} />
        <Stat label="Overall progress" value={`${overall >= 1 || overall === 0 ? Math.round(overall) : overall.toFixed(1)}%`}
          color="text-indigo-600" />
      </div>
      {goals && goals.length > 0 && (
        <p className="-mt-3 mb-6 text-sm text-slate-500">{reached} of {goals.length} goal{goals.length === 1 ? "" : "s"} reached</p>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <SavingsGoalsPanel onChanged={loadActivity} onLoaded={setGoals} />

        <div className="h-fit rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
          <h3 className="mb-2 flex items-center gap-2 text-lg font-semibold"><Target size={20} className="text-indigo-600" /> Recent savings activity</h3>
          {activity === null && <p className="text-slate-500">Loading...</p>}
          {activity?.length === 0 && <p className="text-slate-500">No savings moves yet. Add savings to a goal and it shows up here.</p>}
          <ul className="divide-y divide-slate-100">
            {activity?.map((t) => (
              <li key={t._id} className="flex items-center gap-3 py-2.5">
                <TxIcon t={t} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{txTitle(t)}</div>
                  <div className="truncate text-sm text-slate-500">{txSubtitle(t)}</div>
                </div>
                <span className={`font-semibold ${t.account ? "text-green-600" : "text-red-600"}`}>
                  {t.account ? "+" : "-"}{formatMoney(t.amount)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}