import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { formatMoney } from "../utils/format";

const pctOf = (g) => (g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0);
const pctText = (p) => (p > 0 && p < 1 ? p.toFixed(1) : Math.round(p));

export default function SavingsGoalsPanel({ refreshKey = 0 }) {
  const [items, setItems] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.get("/goals")
      .then(({ data }) => { setItems(data); setFailed(false); })
      .catch(() => setFailed(true));
  }, [refreshKey]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Savings goals</h3>
        </div>
        <Link to="/goals" className="text-sm font-medium text-indigo-600 hover:underline">Manage goals</Link>
      </div>

      {failed && <p className="text-red-600">Couldn't load your goals. Refresh the page to try again.</p>}
      {!failed && items === null && <p className="text-slate-500">Loading...</p>}
      {items?.length === 0 && (
        <p className="text-slate-500">No goals yet. <Link to="/goals" className="font-medium text-indigo-600 hover:underline">Create one</Link> and set how much of each income goes into it.</p>
      )}

      <ul className="space-y-4">
        {items?.map((g) => {
          const pct = pctOf(g);
          const done = g.saved >= g.target;
          return (
            <li key={g._id}>
              <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="font-medium">{g.name}</span>
                <span className="text-sm text-slate-600">{formatMoney(g.saved)} of {formatMoney(g.target)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full ${done ? "bg-green-600" : "bg-indigo-600"}`} style={{ width: `${pct > 0 ? Math.max(2, pct) : 0}%` }} />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {done ? "Goal reached" : `${pctText(pct)}% saved`}
                {" · "}
                {g.autoPercent > 0 ? `${g.autoPercent}% of each income goes here` : "Auto-save is off"}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}