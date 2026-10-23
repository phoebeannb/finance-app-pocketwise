import { useEffect, useMemo, useState } from "react";
import { Check, ChevronRight, CircleHelp, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { card } from "../components/ui";

const ITEMS = [
  ["account", "Add a bank or wallet", "Connect the place where your money lives.", "/accounts"],
  ["transaction", "Add your first transaction", "Record something you spent or earned.", "/transactions"],
  ["budget", "Set a monthly budget", "Give your spending a limit that is easy to follow.", "/budgets"],
  ["bill", "Track a recurring bill", "Get reminded about rent, utilities, or subscriptions.", "/bills"],
  ["goal", "Create a savings goal", "Give your next financial goal a clear target.", "/goals"],
];

const storageKey = (email) => `pw_setup_${(email || "guest").toLowerCase()}`;

export default function SetupGuide() {
  const { user } = useAuth();
  const key = storageKey(user?.email);
  const [done, setDone] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      api.get("/accounts"),
      api.get("/transactions", { params: { limit: 1 } }),
      api.get("/budgets"),
      api.get("/recurring"),
      api.get("/goals"),
    ]).then(([accounts, transactions, budgets, bills, goals]) => {
      if (!alive) return;
      const automatic = [];
      if (accounts.data.length) automatic.push("account");
      if (transactions.data.length) automatic.push("transaction");
      if (budgets.data.length) automatic.push("budget");
      if (bills.data.length) automatic.push("bill");
      if (goals.data.length) automatic.push("goal");
      setDone((current) => [...new Set([...current, ...automatic])]);
    }).catch(() => {}).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const completed = useMemo(() => new Set(done), [done]);
  const toggle = (id) => {
    const next = completed.has(id) ? done.filter((x) => x !== id) : [...done, id];
    setDone(next);
    try { localStorage.setItem(key, JSON.stringify(next)); } catch { /* progress is optional */ }
  };
  const progress = Math.round((done.length / ITEMS.length) * 100);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <WalletCards size={23} aria-hidden="true" />
          </div>
          <h2 className="text-2xl font-semibold sm:text-3xl">Set up PocketWise</h2>
          <p className="mt-1 text-slate-600">Complete the steps that are useful for you. You can come back to this guide anytime.</p>
        </div>
        <Link to="/" className="text-sm font-medium text-indigo-700 hover:underline">Skip for now</Link>
      </div>

      <div className={`${card} mb-5 p-4`}>
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-800">{done.length} of {ITEMS.length} complete</span>
          <span className="text-slate-600">{progress}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar"
          aria-label="Setup progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="h-full rounded-full bg-indigo-600 transition-[width]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {!loading && progress === 100 && (
        <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
          <strong>You’re ready to go.</strong> Your main PocketWise setup is complete. You can revisit any step whenever you need.
        </div>
      )}
      <section className={`${card} overflow-hidden`} aria-labelledby="setup-list-title">
        <h3 id="setup-list-title" className="sr-only">Setup tasks</h3>
        <ul className="divide-y divide-slate-100">
          {ITEMS.map(([id, title, description, to]) => {
            const isDone = completed.has(id);
            return (
              <li key={id} className="flex items-center gap-3 p-4 sm:p-5">
                <button type="button" onClick={() => toggle(id)} aria-pressed={isDone}
                  aria-label={`${isDone ? "Mark incomplete" : "Mark complete"}: ${title}`}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${isDone ? "border-green-600 bg-green-600 text-white" : "border-slate-300 text-transparent hover:border-indigo-500"}`}>
                  <Check size={16} aria-hidden="true" />
                </button>
                <div className="min-w-0 flex-1">
                  <div className={`font-medium ${isDone ? "text-slate-500 line-through" : "text-slate-900"}`}>{title}</div>
                  <p className="mt-0.5 text-sm text-slate-600">{description}</p>
                </div>
                <Link to={to} onClick={() => { if (!isDone) toggle(id); }}
                  className="flex shrink-0 items-center gap-1 rounded-md px-2 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
                  Open <ChevronRight size={16} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="mt-4 flex items-start gap-2 text-xs text-slate-500">
        <CircleHelp size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        Your checklist progress is saved on this device. You can change or revisit any setup item later.
      </p>
    </div>
  );
}
