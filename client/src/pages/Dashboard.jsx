import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, AlertCircle, ArrowDownLeft, ArrowUpRight, ScanLine } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useQuickAdd } from "../context/QuickAddContext";
import { formatMoney } from "../utils/format";
import { relativeDay } from "../utils/datetime";
import { monthNow, monthLabel } from "../utils/months";
import { txTitle } from "../utils/txDisplay";
import { txNote, hasNote, txSign, txColor, txAccount } from "../utils/txTable";
import BudgetsPanel from "../components/BudgetsPanel";
import SavingsGoalsPanel from "../components/SavingsGoalsPanel";
import InboxList from "../components/InboxList";
import MonthStepper from "../components/MonthStepper";
import { CategoryBadge } from "../components/CategoryLabel";
import Skeleton from "../components/Skeleton";
import { Bar, Empty, ErrorBar, card } from "../components/ui";

const SPENDABLE = ["Bank Account", "Other"];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

const dueLabel = (iso) => {
  const d = new Date();
  const today = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const n = Math.round((new Date(iso).getTime() - today) / 86400000);
  return n < 0 ? "Overdue" : n === 0 ? "Due today" : n === 1 ? "Tomorrow" : `In ${n} days`;
};

function healthScore(summary, safe, budgets, insights) {
  if (!summary) return null;
  let score = 50;
  const savingsRate = summary.income > 0 ? summary.balance / summary.income : 0;
  if (summary.income > 0) score += Math.max(-20, Math.min(25, savingsRate * 50));
  if (safe?.safeToday > 0) score += 10;
  if (safe?.safeToday <= 0) score -= 15;
  const budgetCount = budgets.length;
  if (budgetCount) {
    const healthyBudgets = budgets.filter((b) => b.spent < b.limit).length;
    score += (healthyBudgets / budgetCount) * 15;
  }
  if (insights?.billsDue?.items?.some((b) => b.valueRating === "unused")) score -= 5;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function SafeCard({ safe }) {
  if (!safe?.hasAccounts) {
    return (
      <div className={`${card} flex h-full flex-col justify-center p-5`}>
        <div className="text-sm text-slate-600">Safe to spend today</div>
        <p className="mt-1 text-lg font-semibold text-slate-900">Add a bank account to see what's safe to spend.</p>
        <Link to="/accounts" className="mt-2 text-sm font-medium text-indigo-700 hover:underline">Add an account</Link>
      </div>
    );
  }

  const over = safe.safeToday <= 0;
  const used = safe.perDay > 0 ? Math.min(100, (safe.spentToday / safe.perDay) * 100) : over ? 100 : 0;
  return (
    <div className={`${card} h-full p-5 sm:p-6`}>
      <div className="text-sm text-slate-600">Safe to spend today</div>
      <div className={`mt-2 text-4xl font-semibold sm:text-5xl ${over ? "text-red-700" : "text-green-700"}`}>
        {formatMoney(Math.max(0, safe.safeToday))}
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
        {over
          ? safe.left < 0
            ? `Your bills this month are ${formatMoney(-safe.left)} more than the money you have.`
            : "You've used up today's allowance."
          : `After bills, you can spend about ${formatMoney(safe.perDay)} per day for the rest of the month.`}
      </p>
      <div className="mt-4 flex items-center gap-3">
        <div className="flex-1"><Bar pct={used} color={used >= 100 ? "bg-red-600" : "bg-green-600"} label="Today's allowance used" /></div>
        <span className="text-xs text-slate-600">{formatMoney(safe.spentToday)} spent today</span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { open: openAdd, openReceipt, refresh } = useQuickAdd();
  const [month, setMonth] = useState(monthNow());
  const [summary, setSummary] = useState(null);
  const [safe, setSafe] = useState(null);
  const [ins, setIns] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [demoBusy, setDemoBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, t, a, b, sf, ni] = await Promise.all([
        api.get("/transactions/summary", { params: { month } }),
        api.get("/transactions", { params: { limit: 6 } }),
        api.get("/accounts"),
        api.get("/budgets", { params: { month } }).catch(() => ({ data: [] })),
        api.get("/safe-to-spend").catch(() => ({ data: null })), // a problem in one extra shouldn't blank the page
        api.get("/insights", { params: { month } }).catch(() => ({ data: null })),
      ]);
      setSummary(s.data);
      setRecent(t.data);
      setAccounts(a.data);
      setBudgets(b.data);
      setSafe(sf.data);
      setIns(ni.data);
      setError("");
    } catch (err) {
      setError(err.response ? "Something went wrong loading your overview." : "Can't reach the server. Make sure it's running, then try again.");
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = () => { load(); setRefreshKey((k) => k + 1); };

  const loadDemo = async () => {
    setDemoBusy(true);
    try {
      await api.post("/demo/load", {}, { successMessage: "Demo data loaded. Have a look around." });
      refresh();
    } catch { /* the red message explains why */ } finally {
      setDemoBusy(false);
    }
  };

  const firstName = (user?.name || "").split(" ")[0];
  const spendable = (accounts || []).filter((a) => SPENDABLE.includes(a.type));
  const available = spendable.reduce((s, a) => s + a.currentBalance, 0);
  const isEmpty = summary && accounts && accounts.length === 0 && recent.length === 0;
  const score = healthScore(summary, safe, budgets, ins);
  const scoreLabel = score >= 80 ? "Strong" : score >= 60 ? "On track" : score >= 40 ? "Needs attention" : "At risk";
  const scoreColor = score >= 80 ? "text-green-700" : score >= 60 ? "text-indigo-700" : score >= 40 ? "text-amber-700" : "text-red-700";
  const setupActions = [
    !accounts?.length && { text: "Add a bank or wallet so PocketWise can calculate your available balance.", to: "/accounts", action: "Add account" },
    !budgets?.length && { text: "Set a monthly budget to see how much you can safely spend.", to: "/budgets", action: "Set budget" },
    !ins?.billsDue?.items?.length && { text: "Add a recurring bill so you can get reminders before it is due.", to: "/bills", action: "Add bill" },
  ].filter(Boolean);
  const attention = [
    safe?.safeToday <= 0 && {
      text: safe.left < 0 ? "Your planned bills are higher than your available money." : "You have used today's safe-to-spend amount.",
      to: "/budgets",
      action: "Review spending",
    },
    ...(budgets || []).filter((b) => b.spent >= b.limit * 0.8).slice(0, 2).map((b) => ({
      text: b.spent >= b.limit
        ? `${b.category} is over budget by ${formatMoney(b.spent - b.limit)}.`
        : `${b.category} is at ${Math.round((b.spent / b.limit) * 100)}% of its budget.`,
      to: "/budgets",
      action: "Review budget",
    })),
    ...(ins?.billsDue?.items || []).filter((b) => {
      const d = new Date(b.nextDate);
      const today = new Date();
      const days = Math.round((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
      return days <= (b.reminderDays ?? 3);
    }).slice(0, 2).map((b) => ({
      text: `${b.name} is ${dueLabel(b.nextDate).toLowerCase()}.`,
      to: "/bills",
      action: "View bills",
    })),
    ...(ins?.billsDue?.items || []).filter((b) => b.valueRating === "unused").slice(0, 1).map((b) => ({
      text: `${b.name} is marked unused and is still due soon.`,
      to: "/bills",
      action: "Review subscription",
    })),
    ...spendable.filter((a) => a.currentBalance < 0).slice(0, 1).map((a) => ({
      text: `${a.name} has a negative balance of ${formatMoney(Math.abs(a.currentBalance))}.`,
      to: "/accounts",
      action: "View account",
    })),
  ].filter(Boolean);
  const nextActions = [...attention, ...setupActions].slice(0, 4);
  return (
    <div className="w-full">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 inline-flex rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-800">
            {new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{greeting()}, {firstName}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => openAdd({ type: "expense" })}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 hover:shadow-md">
              <ArrowDownLeft size={16} aria-hidden="true" /> Add expense
            </button>
            <button onClick={() => openAdd({ type: "income" })}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50">
              <ArrowUpRight size={16} aria-hidden="true" /> Add income
            </button>
            <button onClick={openReceipt} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50">
              <ScanLine size={16} aria-hidden="true" /> Scan receipt
            </button>
          </div>
        </div>
      </header>

      {error && <ErrorBar message={error} onRetry={load} />}

      {!summary && !error && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-48 lg:col-span-2" /><Skeleton className="h-48" /></div>
          <div className="grid gap-4 sm:grid-cols-3"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        </div>
      )}

      {summary && isEmpty && (
        <Empty icon={Sparkles} title="Welcome to PocketWise"
          action={
            <>
              <Link to="/accounts" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">1. Add an account</Link>
              <button onClick={openAdd} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">2. Log your first transaction</button>
              <Link to="/goals" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">3. Create a goal</Link>
              <button onClick={openAdd} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">4. Record an expense</button>
              <Link to="/setup" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">Open setup guide</Link>
              <button onClick={loadDemo} disabled={demoBusy} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-60">
                {demoBusy ? "Loading..." : "Or look around with demo data"}
              </button>
            </>
          }>
          Add the place your money lives, then log what you spend. Your overview, forecast and budgets fill in as you go.
        </Empty>
      )}

      {summary && !isEmpty && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2"><SafeCard safe={safe} /></div>
            <div className={`${card} p-5 sm:p-6`}>
              <div className="text-sm text-slate-600">Available Balance</div>
              <div className={`mt-2 text-3xl font-semibold ${available < 0 ? "text-red-700" : "text-slate-900"}`}>
                {spendable.length ? formatMoney(available) : "—"}
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {spendable.length ? `Across ${spendable.length} bank account${spendable.length === 1 ? "" : "s"} and wallet${spendable.length === 1 ? "" : "s"}` : "Add a bank account to see this"}
              </p>
              {summary.saved > 0 && <p className="mt-2 text-xs font-medium text-green-700">{formatMoney(summary.saved)} moved to your goals this month</p>}
              <Link to="/accounts" className="mt-3 inline-block text-sm font-medium text-indigo-700 hover:underline">See accounts</Link>
            </div>
          </div>

          <div className="mb-2 mt-7 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold">{monthLabel(month)}</h3>
            <MonthStepper month={month} onChange={setMonth} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className={`${card} p-5`}>
              <div className="text-sm text-slate-600">Income · {monthLabel(month)}</div>
              <div className="mt-2 text-3xl font-semibold text-green-700">{formatMoney(summary.income)}</div>
            </div>
            <div className={`${card} p-5`}>
              <div className="text-sm text-slate-600">Expenses · {monthLabel(month)}</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{formatMoney(summary.expenses)}</div>
            </div>
            <div className={`${card} p-5`}>
              <div className="text-sm text-slate-600">Savings rate · {monthLabel(month)}</div>
              <div className={`mt-2 text-3xl font-semibold ${summary.income > 0 && summary.balance < 0 ? "text-red-700" : "text-green-700"}`}>
                {summary.income > 0 ? `${Math.round((summary.balance / summary.income) * 100)}%` : "—"}
              </div>
              {ins?.before && (
                <p className="mt-1 text-xs text-slate-600">
                  {ins.now.expenses < ins.before.expenses ? "Spending is down" : "Spending is up"} {formatMoney(Math.abs(ins.now.expenses - ins.before.expenses))} vs. last month
                </p>
              )}
            </div>
            <div className={`${card} p-5`}>
              <div className="text-sm text-slate-600">Financial Health</div>
              <div className={`mt-2 text-3xl font-semibold ${scoreColor}`}>{score}/100</div>
              <p className={`mt-1 text-xs font-medium ${scoreColor}`}>{scoreLabel}</p>
            </div>
          </div>

          {nextActions.length > 0 && (
            <section className={`${card} mt-5 border-amber-200 bg-amber-50/50 p-4 sm:p-5`} aria-labelledby="attention-title">
              <div className="mb-2 flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-700" aria-hidden="true" />
                <h3 id="attention-title" className="text-base font-semibold">What should I do next?</h3>
              </div>
              <ul className="divide-y divide-amber-200/70">
                {nextActions.map((item) => (
                  <li key={item.text} className="flex flex-wrap items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                    <span className="text-sm text-slate-700">{item.text}</span>
                    <Link to={item.to} className="text-sm font-medium text-indigo-700 hover:underline">{item.action}</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-5"><InboxList refreshKey={refreshKey} onChanged={handleSaved} /></div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <section className={`${card} p-4 sm:p-5`} aria-labelledby="due-title">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 id="due-title" className="text-lg font-semibold">Bills due soon</h3>
                <Link to="/bills" className="text-sm font-medium text-indigo-700 hover:underline">Manage Bills</Link>
              </div>
              {ins?.billsDue?.items.length ? (
                <>
                  <ul className="divide-y divide-slate-100">
                    {ins.billsDue.items.map((b) => (
                      <li key={b._id} className="flex items-center gap-3 py-2.5">
                        <CategoryBadge t={{ type: "expense", category: b.category, description: b.name }} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium">{b.name}</div>
                          <div className={`text-xs ${dueLabel(b.nextDate) === "Overdue" || dueLabel(b.nextDate) === "Due today" ? "font-medium text-amber-800" : "text-slate-600"}`}>{dueLabel(b.nextDate)}</div>
                        </div>
                        <div className="font-semibold">{formatMoney(b.amount)}</div>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 border-t border-slate-100 pt-2 text-sm text-slate-700">
                    Total due soon: <span className="font-semibold">{formatMoney(ins.billsDue.total)}</span>
                  </p>
                </>
              ) : (
                <p className="text-slate-600">Nothing due soon. <Link to="/bills" className="font-medium text-indigo-700 hover:underline">Add a bill</Link> to be reminded.</p>
              )}
            </section>
            <SavingsGoalsPanel refreshKey={refreshKey} />
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <BudgetsPanel refreshKey={refreshKey} />

            <section className={`${card} p-4 sm:p-5`} aria-labelledby="recent-title">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 id="recent-title" className="text-lg font-semibold">Recent Transactions</h3>
                <Link to="/transactions" className="text-sm font-medium text-indigo-700 hover:underline">View all</Link>
              </div>
              {recent.length === 0 ? (
                <p className="text-slate-600">No transactions yet.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recent.map((t) => (
                    <li key={t._id} className="flex items-center gap-3 py-2.5">
                      <CategoryBadge t={t} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{txTitle(t)}</div>
                        <div className={`truncate text-xs ${hasNote(t) ? "text-slate-700" : "italic text-slate-600"}`}>
                          {txNote(t)} · {relativeDay(t.date)}
                        </div>
                      </div>
                      <div className={`shrink-0 font-semibold ${txColor(t)}`}>{txSign(t)}{formatMoney(t.amount)}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}