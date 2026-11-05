import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, AlertCircle, ArrowDownLeft, ArrowUpRight, ScanLine, WalletMinimal, PiggyBank, AlertTriangle, Star, TrendingUp, ChartNoAxesCombined } from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useQuickAdd } from "../context/QuickAddContext";
import { formatMoney } from "../utils/format";
import { todayKey } from "../utils/datetime";
import { monthNow, monthLabel } from "../utils/months";
import { txTitle } from "../utils/txDisplay";
import { txNote, hasNote, txSign, txColor } from "../utils/txTable";
import BudgetsPanel from "../components/BudgetsPanel";
import SavingsGoalsPanel from "../components/SavingsGoalsPanel";
import InboxList from "../components/InboxList";
import MonthStepper from "../components/MonthStepper";
import { CategoryBadge } from "../components/CategoryLabel";
import Skeleton from "../components/Skeleton";
import { Empty, ErrorBar, card } from "../components/ui";
import Modal from "../components/Modal";

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
const overviewDate = (iso) => new Intl.DateTimeFormat("en-US", {
  weekday: "long", month: "long", day: "numeric", timeZone: "UTC",
}).format(new Date(iso));
const monthRange = (value) => {
  const [year, month] = value.split("-").map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  const format = (date) => date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${format(start)} - ${format(end)}, ${year}`;
};

function MetricCard({ label, value, icon: Icon, iconTone, detail, children }) {
  return (
    <div className={`${card} relative overflow-hidden p-5`}>
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconTone}`}>
              <Icon size={18} aria-hidden="true" />
            </span>
            <span>{label}</span>
          </div>
          <div className="mt-4 truncate text-3xl font-bold tracking-tight text-slate-900">{value}</div>
        </div>
        {children}
      </div>
      {detail && <div className="relative mt-3 text-xs text-slate-600">{detail}</div>}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { open: openAdd, openReceipt } = useQuickAdd();
  const [month, setMonth] = useState(monthNow());
  const [summary, setSummary] = useState(null);
  const [ins, setIns] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [budgets, setBudgets] = useState([]);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [streak, setStreak] = useState(0);
  const [streakOpen, setStreakOpen] = useState(false);
  const streakDays = Array.from({ length: 30 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (29 - index));
    return { date, active: index >= Math.max(0, 30 - streak) };
  });

  useEffect(() => {
    const key = "pw_daily_streak";
    const today = todayKey();
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (saved?.last === today) setStreak(saved.count || 1);
      else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const previous = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
        const count = saved?.last === previous ? (saved.count || 0) + 1 : 1;
        localStorage.setItem(key, JSON.stringify({ last: today, count }));
        setStreak(count);
      }
    } catch { setStreak(1); }
  }, []);

  const load = useCallback(async () => {
    try {
      const [s, t, a, b, ni] = await Promise.all([
        api.get("/transactions/summary", { params: { month } }),
        api.get("/transactions", { params: { limit: 6 } }),
        api.get("/accounts"),
        api.get("/budgets", { params: { month } }).catch(() => ({ data: [] })),
        api.get("/insights", { params: { month } }).catch(() => ({ data: null })),
      ]);
      setSummary(s.data);
      setRecent(t.data);
      setAccounts(a.data);
      setBudgets(b.data);
      setIns(ni.data);
      setError("");
    } catch (err) {
      setError(err.response ? "Something went wrong loading your overview." : "Can't reach the server. Make sure it's running, then try again.");
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = () => { load(); setRefreshKey((k) => k + 1); };

  const firstName = (user?.name || "").split(" ")[0];
  const spendable = (accounts || []).filter((a) => SPENDABLE.includes(a.type));
  const available = spendable.reduce((s, a) => s + a.currentBalance, 0);
  const investments = (accounts || []).filter((a) => a.type === "Investment").reduce((s, a) => s + a.currentBalance, 0);
  const isEmpty = summary && accounts && accounts.length === 0 && recent.length === 0;
  const setupActions = [
    !accounts?.length && { text: "Add a bank or wallet so PocketWise can calculate your available balance.", to: "/accounts", action: "Add account" },
    !budgets?.length && { text: "Set a monthly budget to see how much you can safely spend.", to: "/budgets", action: "Set budget" },
    !ins?.billsDue?.items?.length && { text: "Add a recurring bill so you can get reminders before it is due.", to: "/bills", action: "Add bill" },
  ].filter(Boolean);
  const attention = [
    ...(budgets || []).filter((b) => b.spent >= b.limit * 0.8).slice(0, 2).map((b) => ({
      severity: b.spent >= b.limit ? "urgent" : "attention",
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
      severity: "attention",
      text: `${b.name} is ${dueLabel(b.nextDate).toLowerCase()}.`,
      to: "/bills",
      action: "View bills",
    })),
    ...(ins?.billsDue?.items || []).filter((b) => b.valueRating === "unused").slice(0, 1).map((b) => ({
      severity: "attention",
      text: `${b.name} is marked unused and is still due soon.`,
      to: "/bills",
      action: "Review subscription",
    })),
    ...spendable.filter((a) => a.currentBalance < 0).slice(0, 1).map((a) => ({
      severity: "urgent",
      text: `${a.name} has a negative balance of ${formatMoney(Math.abs(a.currentBalance))}.`,
      to: "/accounts",
      action: "View account",
    })),
  ].filter(Boolean);
  const nextActions = attention.length ? attention.slice(0, 4) : setupActions.slice(0, 4);
  return (
    <div className="w-full">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold text-slate-600">
            {new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h2 className="text-[30px] font-bold tracking-tight">{greeting()}, {firstName}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setStreakOpen(true)} aria-label={`Open daily streak: ${streak} days`} title="Daily Streak"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-amber-200 bg-amber-50 text-amber-600 shadow-sm hover:bg-amber-100">
            <Star size={20} fill="currentColor" aria-hidden="true" />
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => openAdd({ type: "expense" })}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 hover:shadow-md">
              <ArrowUpRight size={16} aria-hidden="true" /> Add Expense
            </button>
            <button onClick={() => openAdd({ type: "income" })}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50">
              <ArrowDownLeft size={16} aria-hidden="true" /> Add Income
            </button>
            <button onClick={openReceipt} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/50">
              <ScanLine size={16} aria-hidden="true" /> Scan Receipt
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
            </>
          }>
          Add the place your money lives, then log what you spend. Your overview, forecast and budgets fill in as you go.
        </Empty>
      )}

      {summary && !isEmpty && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className={`${card} p-5 sm:p-6 lg:col-span-2`}>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                  <ChartNoAxesCombined size={18} aria-hidden="true" />
                </span>
                <span>Net Balance</span>
              </div>
              <div className={`mt-2 text-4xl font-semibold ${summary.balance < 0 ? "text-red-700" : "text-slate-900"}`}>
                {formatMoney(summary.balance)}
              </div>
              <p className="mt-2 text-sm text-slate-600">Income minus expenses for {monthLabel(month)}.</p>
            </div>
            <div className={`${card} p-5 sm:p-6`}>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  <WalletMinimal size={18} aria-hidden="true" />
                </span>
                <span>Available in wallets</span>
              </div>
              <div className={`mt-2 text-3xl font-semibold ${available < 0 ? "text-red-700" : "text-slate-900"}`}>
                {spendable.length ? formatMoney(available) : "—"}
              </div>
            </div>
          </div>

          <section className={`${card} mt-5 overflow-hidden p-4 sm:p-5`} aria-labelledby="month-overview-title">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 id="month-overview-title" className="text-lg font-semibold">This Month Overview</h3>
                <p className="mt-0.5 text-sm text-slate-500">{monthRange(month)}</p>
              </div>
              <MonthStepper month={month} onChange={setMonth} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Income" value={formatMoney(summary.income)}
              icon={ArrowDownLeft} tone="bg-emerald-100" iconTone="bg-emerald-100 text-emerald-700"
              detail={<span className="font-medium text-emerald-700">Money In</span>}>
            </MetricCard>
            <MetricCard label="Expenses" value={formatMoney(summary.expenses)}
              icon={ArrowUpRight} tone="bg-rose-100" iconTone="bg-rose-100 text-rose-700"
              detail={<span className="font-medium text-slate-600">Money Out</span>}>
            </MetricCard>
            <MetricCard label="Savings"
              value={formatMoney(summary.saved || 0)}
              icon={PiggyBank} tone="bg-amber-100" iconTone="bg-amber-100 text-amber-700"
              detail="Saved this month" />
            <MetricCard label="Investments" value={formatMoney(investments)}
              icon={TrendingUp} tone="bg-sky-100" iconTone="bg-sky-100 text-sky-700"
              detail="Current value" />
            </div>
          </section>

          {nextActions.length > 0 && (
            <section className={`${card} mt-5 border-amber-200 bg-amber-50/50 p-4 sm:p-5`} aria-labelledby="attention-title">
              <div className="mb-2 flex items-center gap-2">
                <AlertCircle size={18} className="text-amber-700" aria-hidden="true" />
                <h3 id="attention-title" className="text-base font-semibold">What should I do next?</h3>
              </div>
              <ul className="divide-y divide-slate-200">
                {nextActions.map((item) => (
                  <li key={item.text} className="flex flex-wrap items-center justify-between gap-2 border-slate-200 py-2 first:pt-0 last:pb-0">
                    <span className="flex items-center gap-2 text-sm text-slate-700">
                      {item.severity === "urgent" ? <AlertTriangle size={16} className="text-amber-600" aria-hidden="true" /> : <AlertCircle size={16} className="text-slate-400" aria-hidden="true" />}
                      {item.text}
                    </span>
                    <Link to={item.to} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50">{item.action}</Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Modal open={streakOpen} onClose={() => setStreakOpen(false)} title="Daily Streak" size="max-w-sm">
            <div className="flex flex-col items-center py-4 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 text-amber-500">
                <Star size={42} fill="currentColor" aria-hidden="true" />
              </div>
              <p className="mt-4 text-3xl font-bold text-slate-900">{streak} day{streak === 1 ? "" : "s"}</p>
              <p className="mt-2 text-sm text-slate-600">Keep opening PocketWise every day to grow your streak.</p>
              <div className="mt-5 w-full rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-left">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">1 month challenge · 30 days</p>
                <p className="mt-1 text-sm text-slate-700">Open PocketWise once a day to complete your monthly streak.</p>
              </div>
              <div className="mt-5 grid w-full grid-cols-6 gap-2" aria-label="Last 30 days">
                {streakDays.map(({ date, active }) => (
                  <div key={date.toISOString()} title={date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    className={`flex h-9 items-center justify-center rounded-lg text-xs font-semibold ${active ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>
                    {date.getDate()}
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">Your 1-month, 30-day progress</p>
              <div className="mt-5 w-full text-left">
                <p className="mb-2 text-sm font-semibold text-slate-800">Reward preview</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[["7 days", "⭐ Starter star"], ["14 days", "🌟 Rising star"], ["30 days", "🏆 Monthly champion"]].map(([days, reward]) => (
                    <div key={days} className={`rounded-lg border p-2 ${streak >= Number(days.split(" ")[0]) ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
                      <p className="text-xs font-semibold text-slate-600">{days}</p>
                      <p className="mt-1 text-xs font-medium text-slate-800">{reward}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Modal>

          <div className="mt-5"><InboxList refreshKey={refreshKey} onChanged={handleSaved} /></div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <section className={`${card} p-4 sm:p-5`} aria-labelledby="due-title">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 id="due-title" className="text-lg font-semibold">Bills Due</h3>
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
                          {txNote(t)} · {overviewDate(t.date)}
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