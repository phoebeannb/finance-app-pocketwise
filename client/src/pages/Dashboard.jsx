import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus, Wallet, TrendingUp, TrendingDown, PiggyBank, History, Scale,
  ChevronLeft, ChevronRight, WifiOff,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../utils/format";
import { largestRemainder } from "../utils/percent";
import { txTitle, txSubtitle } from "../utils/txDisplay";
import TransactionModal from "../components/TransactionModal";
import TrendChart from "../components/TrendChart";
import BudgetsPanel from "../components/BudgetsPanel";
import SavingsGoalsPanel from "../components/SavingsGoalsPanel";
import TxIcon from "../components/TxIcon";
import Skeleton from "../components/Skeleton";

const COLORS = ["#6747f0", "#16a34a", "#f59e0b", "#dc2626", "#0891b2", "#9333ea", "#64748b"];
const SPENDABLE = ["Bank Account", "Other"];

const pad = (n) => String(n).padStart(2, "0");
const monthNow = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const shiftMonth = (m, delta) => {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(Date.UTC(y, mo - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
};
const monthLabel = (m) => {
  const [y, mo] = m.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("en-PH", { month: "long", year: "numeric", timeZone: "UTC" });
};
const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

const TONES = {
  income: "bg-emerald-100 text-emerald-600",
  expense: "bg-rose-100 text-rose-600",
  net: "bg-sky-100 text-sky-600",
  savings: "bg-amber-100 text-amber-600",
};

function Tile({ icon: Icon, label, value, tone, negative }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="mb-3 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${TONES[tone]}`}><Icon size={15} /></span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className={`truncate text-xl font-semibold tracking-tight ${negative ? "text-rose-600" : "text-slate-900"}`}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [month, setMonth] = useState(monthNow());
  const [summary, setSummary] = useState(null);
  const [accounts, setAccounts] = useState(null);
  const [trend, setTrend] = useState([]);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const [s, r, t, a] = await Promise.all([
        api.get("/transactions/summary", { params: { month } }),
        api.get("/reports", { params: { period: "monthly" } }),
        api.get("/transactions", { params: { limit: 5 } }),
        api.get("/accounts"),
      ]);
      setSummary(s.data);
      setTrend(r.data.series.slice(-6));
      setRecent(t.data);
      setAccounts(a.data);
      setError("");
    } catch (err) {
      setError(
        err.response
          ? "Something went wrong loading your overview."
          : "Can't reach the server. Make sure it's running, then try again."
      );
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
  const firstName = (user?.name || "").split(" ")[0];

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">
            {new Date().toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <h2 className="text-3xl font-semibold tracking-tight">{greeting()}, {firstName}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200/70">
            <button onClick={() => setMonth(shiftMonth(month, -1))} aria-label="Previous month"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><ChevronLeft size={18} /></button>
            <span className="min-w-32 px-2 text-center text-sm font-medium">{monthLabel(month)}</span>
            <button onClick={() => setMonth(shiftMonth(month, 1))} disabled={isCurrent} aria-label="Next month"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"><ChevronRight size={18} /></button>
          </div>
          <button onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 transition-colors hover:bg-indigo-700">
            <Plus size={18} /> Add transaction
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl bg-red-50 p-4 text-red-700">
          <WifiOff size={20} />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium shadow-sm hover:bg-red-100">Try again</button>
        </div>
      )}

      {!summary && !error && (
        <div className="space-y-6">
          <Skeleton className="h-56" />
          <div className="grid gap-6 xl:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      )}

      {summary && (
        <>
          <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60 sm:p-8">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Tile icon={TrendingUp} label="Income" value={formatMoney(summary.income)} tone="income" />
              <Tile icon={TrendingDown} label="Expenses" value={formatMoney(summary.expenses)} tone="expense" />
              <Tile icon={Scale} label="Net Worth" value={formatMoney(summary.balance)} tone="net" negative={summary.balance < 0} />
              <Tile icon={PiggyBank} label="Savings Rate" value={`${savingsRate}%`} tone="savings" negative={savingsRate < 0} />
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
              <h3 className="text-lg font-semibold tracking-tight">Income vs. Expenses</h3>
              <p className="mb-2 text-xs text-slate-500">Last 6 months</p>
              <TrendChart kind="line" data={trend} series={[
                { key: "income", name: "Income", color: "#16a34a" },
                { key: "expenses", name: "Expenses", color: "#dc2626" },
              ]} />
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
              <h3 className="text-lg font-semibold tracking-tight">Spending by category</h3>
              <p className="mb-2 text-xs text-slate-500">{monthLabel(month)}</p>
              {chartData.length === 0 ? (
                <p className="text-slate-500">No expenses in this month.</p>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" outerRadius="65%" innerRadius="40%" paddingAngle={2}
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
            <SavingsGoalsPanel onChanged={handleSaved} />
          </div>

          <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/60">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight"><History size={20} className="text-indigo-600" /> Recent Transactions</h3>
              <Link to="/transactions" className="text-sm font-medium text-indigo-600 hover:underline">View all</Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-slate-500">No transactions yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((t) => (
                  <li key={t._id} className="flex items-center gap-3 py-2.5">
                    <TxIcon t={t} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{txTitle(t)}</div>
                      <div className="truncate text-sm text-slate-500">{txSubtitle(t)}</div>
                    </div>
                    <span className={`font-semibold ${t.type === "income" ? "text-green-600" : t.type === "expense" ? "text-red-600" : "text-indigo-600"}`}>
                      {t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}{formatMoney(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <TransactionModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={handleSaved} />
    </div>
  );
}