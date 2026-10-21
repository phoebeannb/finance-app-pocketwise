import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { fmtDateTime } from "../utils/datetime";
import { largestRemainder } from "../utils/percent";
import { monthNow, shiftMonth, monthLabel } from "../utils/months";
import { txTitle } from "../utils/txDisplay";
import { txNote, txSign, txColor } from "../utils/txTable";
import TransactionModal from "../components/TransactionModal";
import TrendChart from "../components/TrendChart";
import BudgetsPanel from "../components/BudgetsPanel";
import SavingsGoalsPanel from "../components/SavingsGoalsPanel";
import QuickCapture from "../components/QuickCapture";
import InboxList from "../components/InboxList";
import Skeleton from "../components/Skeleton";
import { Stat, TableCard, ErrorBar } from "../components/ui";

const COLORS = ["#255ca3", "#15803d", "#d97706", "#b91c1c", "#0e7490", "#7e22ce", "#64748b"];
const SPENDABLE = ["Bank Account", "Other"];

export default function Dashboard() {
  const [month, setMonth] = useState(monthNow());
  const [summary, setSummary] = useState(null);
  const [safe, setSafe] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [trend, setTrend] = useState([]);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const [s, r, t, a, sf] = await Promise.all([
        api.get("/transactions/summary", { params: { month } }),
        api.get("/reports", { params: { period: "monthly" } }),
        api.get("/transactions", { params: { limit: 5 } }),
        api.get("/accounts"),
        api.get("/safe-to-spend").catch(() => ({ data: null })), // a problem here shouldn't blank the page
      ]);
      setSummary(s.data);
      setTrend(r.data.series.slice(-6));
      setRecent(t.data);
      setAccounts(a.data);
      setSafe(sf.data);
      setError("");
    } catch (err) {
      setError(err.response ? "Something went wrong loading your overview." : "Can't reach the server. Make sure it's running, then try again.");
    }
  }, [month]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = () => {
    load();
    setRefreshKey((k) => k + 1);
  };

  const chartData = useMemo(
    () => (summary?.byCategory || []).map((c) => ({ name: c._id || "Uncategorized", value: c.total })),
    [summary]
  );
  const pcts = useMemo(() => largestRemainder(chartData.map((d) => d.value)), [chartData]);

  const hasSpendable = (accounts || []).some((a) => SPENDABLE.includes(a.type));
  const available = (accounts || []).filter((a) => SPENDABLE.includes(a.type)).reduce((s, a) => s + a.currentBalance, 0);
  const savingsRate = summary && summary.income > 0
    ? Math.round(((summary.income - summary.expenses) / summary.income) * 100)
    : 0;
  const isCurrent = month === monthNow();

  // Safe to spend today
  let safeValue = "—";
  let safeHint = "Add a bank account to see this";
  let safeColor = "text-slate-900";
  let safeTitle = "";
  if (safe?.hasAccounts) {
    const over = safe.safeToday <= 0;
    safeValue = formatMoney(Math.max(0, safe.safeToday));
    safeColor = over ? "text-red-600" : "text-green-600";
    safeHint = over
      ? safe.left < 0
        ? `Bills due this month are ${formatMoney(-safe.left)} more than your balance`
        : "You've used up today's allowance"
      : `${formatMoney(safe.perDay)} a day · ${safe.daysLeft} day${safe.daysLeft === 1 ? "" : "s"} left this month`;
    safeTitle = `Balance ${formatMoney(safe.balance)} + expected income ${formatMoney(safe.income)} − bills due ${formatMoney(safe.bills)} = ${formatMoney(safe.left)} for the rest of the month. Spent today: ${formatMoney(safe.spentToday)}.`;
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Overview</h2>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5">
            <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"><ChevronLeft size={18} /></button>
            <span className="min-w-32 px-2 text-center text-sm font-medium">{monthLabel(month)}</span>
            <button onClick={() => setMonth(shiftMonth(month, 1))} disabled={isCurrent} aria-label="Next month"
              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"><ChevronRight size={18} /></button>
          </div>
          {!isCurrent && (
            <button onClick={() => setMonth(monthNow())} className="text-sm font-medium text-indigo-600 hover:underline">This month</button>
          )}
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus size={16} /> Add transaction
          </button>
        </div>
      </div>

      {error && <ErrorBar message={error} onRetry={load} />}

      <QuickCapture onCaptured={handleSaved} />

      {!summary && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}</div>
          <div className="grid gap-6 xl:grid-cols-2"><Skeleton className="h-80" /><Skeleton className="h-80" /></div>
        </div>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
            <Stat label="Available balance" value={hasSpendable ? formatMoney(available) : "—"}
               />
            <div title={safeTitle}>
              <Stat label="Safe to spend today" value={safeValue} hint={safeHint} color={safeColor} />
            </div>
            <Stat label="Income" value={formatMoney(summary.income)} color="text-green-600" />
            <Stat label="Expenses" value={formatMoney(summary.expenses)} color="text-red-600" />
            <Stat label="Savings Rate" value={`${savingsRate}%`}
              color={savingsRate < 0 ? "text-red-600" : "text-slate-900"} />
          </div>

          <InboxList refreshKey={refreshKey} onChanged={handleSaved} />

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold">Income vs. Expenses</h3>
              <p className="mb-2 text-xs text-slate-500">Last 6 months</p>
              <TrendChart kind="line" data={trend} series={[
                { key: "income", name: "Income", color: "#15803d" },
                { key: "expenses", name: "Expenses", color: "#b91c1c" },
              ]} />
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h3 className="text-lg font-semibold">Spending by category</h3>
              <p className="mb-2 text-xs text-slate-500">{monthLabel(month)}</p>
              {chartData.length === 0 ? (
                <p className="text-slate-500">No expenses in this month.</p>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" outerRadius="68%"
                        label={(e) => `${formatMoney(e.value)} (${pcts[chartData.findIndex((d) => d.name === e.name)]}%)`}>
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => formatMoney(v)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <BudgetsPanel refreshKey={refreshKey} />
            <SavingsGoalsPanel refreshKey={refreshKey} />
          </div>

          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Recent transactions</h3>
              <Link to="/transactions" className="text-sm font-medium text-indigo-600 hover:underline">View all</Link>
            </div>
            <TableCard>
              <table className="data-table">
                <thead>
                  <tr><th>Date</th><th>Category</th><th>Description</th><th className="num">Amount</th></tr>
                </thead>
                <tbody>
                  {recent.map((t) => (
                    <tr key={t._id}>
                      <td className="whitespace-nowrap text-slate-500">{fmtDateTime(t.date)}</td>
                      <td className="font-medium">{txTitle(t)}</td>
                      <td className="max-w-[260px] truncate text-slate-600">{txNote(t)}</td>
                      <td className={`num font-semibold ${txColor(t)}`}>{txSign(t)}{formatMoney(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {recent.length === 0 && <p className="p-6 text-center text-slate-500">No transactions yet.</p>}
            </TableCard>
          </div>
        </>
      )}

      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={handleSaved} />
    </div>
  );
}