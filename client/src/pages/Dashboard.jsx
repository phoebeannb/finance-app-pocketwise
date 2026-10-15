import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Wallet, TrendingUp, TrendingDown, PiggyBank, History } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../utils/format";
import { txTitle, txSubtitle } from "../utils/txDisplay";
import TransactionModal from "../components/TransactionModal";
import TrendChart from "../components/TrendChart";
import BudgetsPanel from "../components/BudgetsPanel";
import SavingsGoalsPanel from "../components/SavingsGoalsPanel";
import TxIcon from "../components/TxIcon";

const COLORS = ["#4f46e5", "#16a34a", "#f59e0b", "#dc2626", "#0891b2", "#9333ea", "#64748b"];

function Card({ icon: Icon, label, value, color = "text-slate-800", tint = "bg-slate-100 text-slate-600" }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tint}`}>
        <Icon size={22} />
      </span>
      <div className="min-w-0">
        <div className="text-sm text-slate-500">{label}</div>
        <div className={`truncate text-2xl font-semibold ${color}`}>{value}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [trend, setTrend] = useState([]);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const [s, r, t] = await Promise.all([
        api.get("/transactions/summary", { params: { period: "month" } }),
        api.get("/reports", { params: { period: "monthly" } }),
        api.get("/transactions", { params: { limit: 5 } }),
      ]);
      setSummary(s.data);
      setTrend(r.data.series.slice(-6));
      setRecent(t.data);
      setError("");
    } catch {
      setError("Could not load your overview");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaved = () => {
    load();
    setRefreshKey((k) => k + 1);
  };

  const chartData = (summary?.byCategory || []).map((c) => ({ name: c._id || "Uncategorized", value: c.total }));
  const savingsRate = summary && summary.income > 0
    ? Math.round(((summary.income - summary.expenses) / summary.income) * 100)
    : 0;

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Welcome, {user.name}</h2>
          <p className="text-slate-500">Your overview for this month</p>
        </div>
        <button onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700">
          <Plus size={18} /> Add transaction
        </button>
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}
      {!summary && !error && <p>Loading...</p>}

      {summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card icon={Wallet} label="Available Balance" value={formatMoney(summary.balance)}
              color={summary.balance < 0 ? "text-red-600" : "text-slate-800"} tint="bg-indigo-100 text-indigo-600" />
            <Card icon={TrendingUp} label="Total Income" value={formatMoney(summary.income)}
              color="text-green-600" tint="bg-green-100 text-green-600" />
            <Card icon={TrendingDown} label="Total Expenses" value={formatMoney(summary.expenses)}
              color="text-red-600" tint="bg-red-100 text-red-600" />
            <Card icon={PiggyBank} label="Savings Rate" value={`${savingsRate}%`}
              color={savingsRate < 0 ? "text-red-600" : "text-indigo-600"} tint="bg-amber-100 text-amber-600" />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold">Income vs. Expenses</h3>
              <p className="mb-2 text-xs text-slate-500">Last 6 months</p>
              <TrendChart kind="line" data={trend} series={[
                { key: "income", name: "Income", color: "#16a34a" },
                { key: "expenses", name: "Expenses", color: "#dc2626" },
              ]} />
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="mb-2 text-lg font-semibold">Spending by category</h3>
              {chartData.length === 0 ? (
                <p className="text-slate-500">No expenses this month yet.</p>
              ) : (
                <div className="h-72 w-full">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={chartData} dataKey="value" nameKey="name" outerRadius="70%" label>
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

          <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold"><History size={20} className="text-indigo-600" /> Recent Transactions</h3>
              <Link to="/transactions" className="text-sm text-indigo-600 hover:underline">View all</Link>
            </div>
            {recent.length === 0 ? (
              <p className="text-slate-500">No transactions yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((t) => (
                  <li key={t._id} className="flex items-center gap-3 py-2">
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