import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, ChevronDown, Sparkles } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { useQuickAdd } from "../context/QuickAddContext";
import useMediaQuery from "../hooks/useMediaQuery";
import { formatMoney } from "../utils/format";
import { fmtTime, relativeDay } from "../utils/datetime";
import { largestRemainder } from "../utils/percent";
import { monthNow, monthLabel } from "../utils/months";
import { categoryLink, monthLink } from "../utils/ranges";
import { txTitle } from "../utils/txDisplay";
import { txNote, hasNote, txSign, txColor, txAccount } from "../utils/txTable";
import TrendChart from "../components/TrendChart";
import BudgetsPanel from "../components/BudgetsPanel";
import SavingsGoalsPanel from "../components/SavingsGoalsPanel";
import InboxList from "../components/InboxList";
import MonthStepper from "../components/MonthStepper";
import { CategoryBadge } from "../components/CategoryLabel";
import Skeleton from "../components/Skeleton";
import { Bar, Empty, ErrorBar, card } from "../components/ui";

const COLORS = ["#255ca3", "#15803d", "#b45309", "#c81e1e", "#0e7490", "#7e22ce", "#64748b"];
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

// ▲ 12% more than last month. The arrow and words carry the meaning, not just the color.
function Change({ now, before, upIsGood, compare }) {
  if (now === undefined || !before || before <= 0) return <p className="mt-1 text-xs text-slate-600">Nothing from last month to compare yet</p>;
  const diff = ((now - before) / before) * 100;
  const pct = Math.round(Math.abs(diff));
  const when = compare === "pace" ? "this time last month" : "the month before";
  if (pct === 0) return <p className="mt-1 text-xs text-slate-600">About the same as {when}</p>;
  const up = diff > 0;
  return (
    <p className={`mt-1 text-xs font-medium ${up === upIsGood ? "text-green-700" : "text-red-700"}`}>
      {up ? "▲" : "▼"} {pct}% {up ? "more" : "less"} than {when}
    </p>
  );
}

function SafeCard({ safe }) {
  const [open, setOpen] = useState(false);

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
  const rows = [
    ["Money in your bank accounts and wallets", formatMoney(safe.balance)],
    ["Income still expected this month", `+ ${formatMoney(safe.income)}`],
    [`Bills still due this month (${safe.billCount})`, `− ${formatMoney(safe.bills)}`],
    ["Left for the rest of the month", formatMoney(safe.left)],
    [`Spread over ${safe.daysLeft} day${safe.daysLeft === 1 ? "" : "s"} (including today)`, `${formatMoney(safe.perDay)} a day`],
    ["Already spent today", `− ${formatMoney(safe.spentToday)}`],
  ];

  return (
    <div className={`${card} h-full p-5`}>
      <div className="text-sm text-slate-600">Safe to spend today</div>
      <div className={`mt-1 text-4xl font-semibold sm:text-5xl ${over ? "text-red-700" : "text-green-700"}`}>
        {formatMoney(Math.max(0, safe.safeToday))}
      </div>
      <p className="mt-1 text-sm text-slate-700">
        {over
          ? safe.left < 0
            ? `Your bills this month are ${formatMoney(-safe.left)} more than the money you have.`
            : "You've used up today's allowance."
          : `You can spend this today and still cover your bills. That's about ${formatMoney(safe.perDay)} a day for the rest of the month.`}
      </p>
      <div className="mt-3 flex items-center gap-3">
        <div className="flex-1"><Bar pct={used} color={used >= 100 ? "bg-red-600" : "bg-green-600"} label="Today's allowance used" /></div>
        <span className="text-xs text-slate-600">{formatMoney(safe.spentToday)} spent today</span>
      </div>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:underline">
        How is this worked out? <ChevronDown size={16} aria-hidden="true" className={open ? "rotate-180" : ""} />
      </button>
      {open && (
        <dl className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-2">
              <dt className="text-slate-700">{k}</dt>
              <dd className="shrink-0 font-medium text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { open: openAdd, refresh } = useQuickAdd();
  const navigate = useNavigate();
  const phone = useMediaQuery("(max-width: 639px)");
  const [month, setMonth] = useState(monthNow());
  const [summary, setSummary] = useState(null);
  const [safe, setSafe] = useState(null);
  const [ins, setIns] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [trend, setTrend] = useState([]);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [demoBusy, setDemoBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, r, t, a, sf, ni] = await Promise.all([
        api.get("/transactions/summary", { params: { month } }),
        api.get("/reports", { params: { period: "monthly" } }),
        api.get("/transactions", { params: { limit: 6 } }),
        api.get("/accounts"),
        api.get("/safe-to-spend").catch(() => ({ data: null })), // a problem in one extra shouldn't blank the page
        api.get("/insights", { params: { month } }).catch(() => ({ data: null })),
      ]);
      setSummary(s.data);
      setTrend(r.data.series.slice(-6));
      setRecent(t.data);
      setAccounts(a.data);
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

  const chartData = useMemo(
    () => (summary?.byCategory || []).map((c) => ({ name: c._id || "Uncategorized", value: c.total })),
    [summary]
  );
  const pcts = useMemo(() => largestRemainder(chartData.map((d) => d.value)), [chartData]);

  const isCurrent = month === monthNow();
  const firstName = (user?.name || "").split(" ")[0];
  const spendable = (accounts || []).filter((a) => SPENDABLE.includes(a.type));
  const available = spendable.reduce((s, a) => s + a.currentBalance, 0);
  const isEmpty = summary && accounts && accounts.length === 0 && recent.length === 0;
  const f = ins?.forecast;
  const projected = f && safe?.hasAccounts ? safe.left - f.projectedVariable : null;

  const topLine = ins?.top
    ? `${ins.top.name} is your biggest spend ${isCurrent ? "this month" : "that month"}: ${formatMoney(ins.top.total)} (${ins.top.share}% of your spending)${
        ins.top.prev > 0
          ? `, ${ins.top.total >= ins.top.prev ? "up" : "down"} ${Math.round(Math.abs((ins.top.total - ins.top.prev) / ins.top.prev) * 100)}% from last month`
          : ""
      }.`
    : "";

  return (
    <div className="w-full">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-600">
            {new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h2 className="text-2xl font-semibold sm:text-3xl">{greeting()}, {firstName}</h2>
          {topLine && <p className="mt-1 max-w-2xl text-sm text-slate-700">{topLine}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MonthStepper month={month} onChange={setMonth} />
          <button onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus size={16} aria-hidden="true" /> Add transaction
          </button>
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
            <div className={`${card} p-5`}>
              <div className="text-sm text-slate-600">Available Balance</div>
              <div className={`mt-1 text-3xl font-semibold ${available < 0 ? "text-red-700" : "text-slate-900"}`}>
                {spendable.length ? formatMoney(available) : "—"}
              </div>
              <p className="mt-1 text-xs text-slate-600">
                {spendable.length ? `Across ${spendable.length} bank account${spendable.length === 1 ? "" : "s"} and wallet${spendable.length === 1 ? "" : "s"}` : "Add a bank account to see this"}
              </p>
              {summary.saved > 0 && <p className="mt-2 text-xs font-medium text-green-700">{formatMoney(summary.saved)} moved to your goals this month</p>}
              <Link to="/accounts" className="mt-3 inline-block text-sm font-medium text-indigo-700 hover:underline">See accounts</Link>
            </div>
          </div>

          <div className={`mt-4 grid gap-4 sm:grid-cols-2 ${projected !== null ? "lg:grid-cols-3" : ""}`}>
            <div className={`${card} p-5`}>
              <div className="text-sm text-slate-600">Income · {monthLabel(month)}</div>
              <div className="mt-1 text-3xl font-semibold text-green-700">{formatMoney(summary.income)}</div>
              <Change now={ins?.now.income} before={ins?.before.income} upIsGood compare={ins?.compare} />
            </div>
            <div className={`${card} p-5`}>
              <div className="text-sm text-slate-600">Expenses · {monthLabel(month)}</div>
              <div className="mt-1 text-3xl font-semibold text-red-700">{formatMoney(summary.expenses)}</div>
              <Change now={ins?.now.expenses} before={ins?.before.expenses} upIsGood={false} compare={ins?.compare} />
            </div>
            {projected !== null && (
              <div className={`${card} p-5`}>
                <div className="text-sm text-slate-600">Forecast for the end of the month</div>
                <div className={`mt-1 text-3xl font-semibold ${projected < 0 ? "text-red-700" : "text-slate-900"}`}>{formatMoney(projected)}</div>
                <p className="mt-1 text-xs text-slate-600">
                  {projected < 0
                    ? "At your usual pace you'd run out before the month ends. "
                    : "What you'd have left if you keep spending like this. "}
                  Your usual spending is {formatMoney(f.variableDaily)} a day, about {formatMoney(f.projectedVariable)} more by the end of the month. Bills and expected income are already counted.
                  {f.early && " It's early in the month, so this gets more accurate each day."}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6"><InboxList refreshKey={refreshKey} onChanged={handleSaved} /></div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section className={`${card} p-5`} aria-labelledby="due-title">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 id="due-title" className="text-lg font-semibold">Bills due this week</h3>
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
                    Total this week: <span className="font-semibold">{formatMoney(ins.billsDue.total)}</span>
                  </p>
                </>
              ) : (
                <p className="text-slate-600">Nothing due in the next 7 days. <Link to="/bills" className="font-medium text-indigo-700 hover:underline">Add a bill</Link> to be reminded.</p>
              )}
            </section>
            <SavingsGoalsPanel refreshKey={refreshKey} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <section className={`${card} p-5`}>
              <h3 className="text-lg font-semibold">Income vs. Expenses</h3>
              <p className="mb-2 text-xs text-slate-600">Last 6 months. Click a point to see that month.</p>
              <TrendChart kind="line" data={trend} onSelect={(p) => navigate(monthLink(p.key))}
                label="Income and expenses for the last six months"
                series={[{ key: "income", name: "Income", color: "#15803d" }, { key: "expenses", name: "Expenses", color: "#c81e1e" }]} />
            </section>

            <section className={`${card} p-5`}>
              <h3 className="text-lg font-semibold">Spending by category</h3>
              <p className="mb-2 text-xs text-slate-600">{monthLabel(month)}. Click a slice to see those transactions.</p>
              {chartData.length === 0 ? (
                <p className="text-slate-600">No expenses in this month.</p>
              ) : (
                <div className="h-72 w-full" role="img" aria-label={`Spending by category: ${chartData.map((d) => `${d.name} ${formatMoney(d.value)}`).join(", ")}`}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={phone ? "75%" : "62%"}
                        onClick={(slice) => navigate(categoryLink(slice.name, month))}
                        label={phone ? false : (e) => `${formatMoney(e.value)} (${pcts[chartData.findIndex((d) => d.name === e.name)]}%)`}>
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatMoney(v)} />
                      <Legend verticalAlign="bottom" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <BudgetsPanel refreshKey={refreshKey} />

            <section className={`${card} p-5`} aria-labelledby="recent-title">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 id="recent-title" className="text-lg font-semibold">Recent transactions</h3>
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