import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight, Check, ChevronRight, CircleHelp, Landmark, ListChecks, PiggyBank, Receipt, Rocket, Sparkles,
  Target, WalletCards,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";
import { card } from "../components/ui";
import { usePrefs } from "../context/PreferencesContext";
import Modal from "../components/Modal";

const ITEMS = [
  ["account", "Add a bank or wallet", "Connect the place where your money lives.", "/accounts", Landmark],
  ["transaction", "Add your first transaction", "Record something you spent or earned.", "/transactions", Receipt],
  ["budget", "Set a monthly budget", "Give your spending a limit that is easy to follow.", "/budgets", PiggyBank],
  ["bill", "Track a recurring bill", "Get reminded about rent, utilities, or subscriptions.", "/bills", ListChecks],
  ["goal", "Create a savings goal", "Give your next financial goal a clear target.", "/goals", Target],
];

const PERSONAS = [
  ["Employed", "Regular salary", "💼"],
  ["Working student", "Allowance or part-time pay", "👜"],
  ["Student", "Allowance or part-time pay", "🎓"],
  ["Freelancer", "Client-based income", "💻"],
  ["Retiree", "Pension income", "🌿"],
  ["Not working", "No regular income right now", "🏠"],
];

const storageKey = (email) => `pw_setup_${(email || "guest").toLowerCase()}`;

export default function SetupGuide() {
  const { user } = useAuth();
  const { prefs, save } = usePrefs();
  const key = storageKey(user?.email);
  const [done, setDone] = useState(() => {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  });
  const [loading, setLoading] = useState(true);
  const [personalizeOpen, setPersonalizeOpen] = useState(false);
  const [setupOpen, setSetupOpen] = useState(false);

  useEffect(() => {
    if (prefs.persona === null) setPersonalizeOpen(true);
  }, [prefs.persona]);

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
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 shadow-sm">
            <WalletCards size={25} aria-hidden="true" />
          </div>
          <p className="text-sm font-semibold text-indigo-700">Welcome to PocketWise</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Make it yours</h1>
          <p className="mt-1 max-w-xl text-slate-600">Choose what you need and get your money workspace ready in a few simple steps.</p>
        </div>
        <Link to="/" className="shrink-0 text-sm font-medium text-indigo-700 hover:underline">Skip for now</Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button type="button" onClick={() => setPersonalizeOpen(true)}
          className={`${card} group p-5 text-left hover:-translate-y-0.5 hover:border-indigo-300`}>
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <Sparkles size={22} aria-hidden="true" />
          </span>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Personalize your experience</h2>
            <ArrowRight size={18} className="text-indigo-600 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </div>
          <p className="mt-1 text-sm text-slate-600">{prefs.persona ? `Set for ${prefs.persona}` : "Tell us what describes you."}</p>
        </button>

        <button type="button" onClick={() => setSetupOpen(true)}
          className={`${card} group p-5 text-left hover:-translate-y-0.5 hover:border-indigo-300`}>
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Rocket size={22} aria-hidden="true" />
          </span>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Set up PocketWise</h2>
            <ArrowRight size={18} className="text-indigo-600 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </div>
          <p className="mt-1 text-sm text-slate-600">{done.length} of {ITEMS.length} steps complete</p>
        </button>
      </div>

      <Modal open={personalizeOpen} onClose={() => setPersonalizeOpen(false)} title="Personalize your experience" size="max-w-2xl">
        <div className="mb-5">
          <div className="mb-2 flex items-center gap-2 text-indigo-700">
            <Sparkles size={18} aria-hidden="true" />
            <span className="text-sm font-semibold">A better fit for you</span>
          </div>
          <h2 className="text-2xl font-semibold">What describes you?</h2>
          <p className="mt-1 text-slate-600">We’ll use this to make PocketWise more relevant to your income and spending routine.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PERSONAS.map(([item, description, icon]) => (
            <button key={item} type="button" onClick={() => save({ persona: item })}
              className={`group rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md ${prefs.persona === item ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100" : "border-slate-200 bg-white"}`}>
              <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${prefs.persona === item ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-700"}`}>
                <span className="text-xl leading-none" role="img" aria-label={`${item} icon`}>{icon}</span>
              </span>
              <span className="block font-medium text-slate-900">{item}</span>
              <span className="mt-1 block text-xs text-slate-600">{description}</span>
              {prefs.persona === item && <Check size={16} className="mt-3 text-indigo-700" aria-label="Selected" />}
            </button>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={() => setPersonalizeOpen(false)} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
            Continue
          </button>
        </div>
      </Modal>

      <Modal open={setupOpen} onClose={() => setSetupOpen(false)} title="Set up PocketWise" size="max-w-2xl">
        <p className="text-slate-600">Complete the steps that are useful for you. You can come back to this guide anytime.</p>
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-800">{done.length} of {ITEMS.length} complete</span>
            <span className="font-medium text-indigo-700">{progress}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Setup progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
            <div className="h-full rounded-full bg-indigo-600 transition-[width]" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200">
          {ITEMS.map(([id, title, description, to, Icon]) => {
            const isDone = completed.has(id);
            return (
              <li key={id} className="flex items-center gap-3 p-4">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isDone ? "bg-green-100 text-green-700" : "bg-indigo-50 text-indigo-700"}`}>
                  {isDone ? <Check size={19} aria-hidden="true" /> : <Icon size={19} aria-hidden="true" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`font-medium ${isDone ? "text-slate-500 line-through" : "text-slate-900"}`}>{title}</div>
                  <p className="mt-0.5 text-sm text-slate-600">{description}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => toggle(id)} aria-pressed={isDone} className="rounded-lg px-2 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100">
                    {isDone ? "Undo" : "Done"}
                  </button>
                  <Link to={to} onClick={() => { if (!isDone) toggle(id); }} className="flex items-center gap-1 rounded-lg px-2 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
                    Open <ChevronRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
        {!loading && progress === 100 && <p className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-900"><strong>You’re ready to go.</strong> Your main setup is complete.</p>}
        <p className="mt-4 flex items-start gap-2 text-xs text-slate-500"><CircleHelp size={15} className="mt-0.5 shrink-0" aria-hidden="true" />Your checklist progress is saved on this device.</p>
      </Modal>
    </div>
  );
}
