import { useEffect, useState } from "react";
import api from "../api/axios";
import { undoableDelete } from "../utils/undoDelete";
import { formatMoney } from "../utils/format";
import { monthLabel } from "../utils/months";
import { Link, useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import { categoryLink, periodLink } from "../utils/ranges";
import TrendChart from "../components/TrendChart";
import Skeleton from "../components/Skeleton";
import { TableCard, ErrorBar } from "../components/ui";
import { usePrefs } from "../context/PreferencesContext";

const PERIODS = [["monthly", "Monthly"], ["yearly", "Yearly"]];
const RANGE = { monthly: "Last 12 months", yearly: "Last 5 years" };
const MONTHLY_BREAKDOWN_RANGES = [6, 12];
const METRICS = {
  expenses: { name: "Expenses", color: "#b91c1c", text: "text-red-600" },
  income: { name: "Income", color: "#15803d", text: "text-green-600" },
  savings: { name: "Savings", color: "#255ca3", text: "text-slate-900" },
};

const csvCell = (value) => `"${String(value ?? "").replace(/"/g, "\"\"")}"`;

export default function Reports() {
  const [period, setPeriod] = useState("monthly");
  const [metric, setMetric] = useState("expenses");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [monthlyBreakdownRange, setMonthlyBreakdownRange] = useState(6);
  const { prefs } = usePrefs();
  const navigate = useNavigate();
  const load = () => {
    setError("");
    api.get("/reports", { params: { period } })
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response ? "Could not load the report." : "Can't reach the server. Make sure it's running, then try again."));
  };
  useEffect(load, [period]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setMonthlyBreakdownRange(prefs.reportRange || 6); }, [prefs.reportRange]);

  const months = data ? [...data.monthly].reverse() : [];
  const rows = months.slice(0, monthlyBreakdownRange);
  const exportReport = () => {
    if (!data) return;
    const lines = [
      ["PocketWise report", period],
      [],
      ["Totals", "Amount"],
      ["Income", data.totals.income],
      ["Expenses", data.totals.expenses],
      ["Savings", data.totals.savings],
      [],
      ["Category breakdown"],
      ["Category", "Amount", "Share"],
      ...data.categories.map((c) => [c.category, c.total, `${c.percent}%`]),
      [],
      ["Monthly breakdown"],
      ["Month", "Income", "Expenses", "Savings", "Rate"],
      ...rows.map((m) => [
        monthLabel(m.key), m.income, m.expenses, m.savings,
        m.income > 0 ? `${Math.round((m.savings / m.income) * 100)}%` : "—",
      ]),
    ];
    const blob = new Blob([lines.map((line) => line.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pocketwise-${period}-report.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Reports</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            {PERIODS.map(([value, label]) => (
              <button key={value} onClick={() => setPeriod(value)}
                className={`rounded-md px-4 py-1.5 text-sm font-medium ${period === value ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                {label}
              </button>
            ))}
          </div>
          <button type="button" onClick={exportReport}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Download size={16} aria-hidden="true" /> Export CSV
          </button>
        </div>
      </div>

      {error && <ErrorBar message={error} onRetry={load} />}
      {!data && !error && <div className="grid gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-24" />)}</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Object.entries(METRICS).map(([key, m]) => (
              <button key={key} onClick={() => setMetric(key)}
                className={`rounded-lg border bg-white p-4 text-left ${metric === key ? "border-indigo-500 ring-1 ring-indigo-500" : "border-slate-200 hover:border-slate-300"}`}>
                <div className="text-sm text-slate-500">{m.name}</div>
                <div className={`mt-1 truncate text-2xl font-semibold ${key === "savings" && data.totals.savings < 0 ? "text-red-600" : m.text}`}>
                  {formatMoney(data.totals[key])}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold">{METRICS[metric].name} over time</h3>
            <p className="mb-2 text-xs text-slate-500">{RANGE[period]} </p>
            <TrendChart kind="bar" data={data.series} onSelect={(p) => navigate(periodLink(p.key, metric))}
              series={[{ key: metric, name: METRICS[metric].name, color: METRICS[metric].color }]} />
          </div>

          <div className="mt-6 grid items-start gap-6 xl:grid-cols-2">
            <div>
              <h3 className="mb-2 text-lg font-semibold">Category Breakdown</h3>
              <p className="mb-2 text-xs text-slate-500">Select a category to view its transactions.</p>
              <TableCard>
                <table className="data-table">
                  <thead><tr><th>Category</th><th className="num">Amount</th><th className="num">Share</th></tr></thead>
                  <tbody>
                    {data.categories.map((c) => (
                      <tr key={c.category}>
                        <td className="font-medium">
                          <Link to={categoryLink(c.category)} className="text-indigo-700 hover:underline"
                            aria-label={`View ${c.category} transactions`}>
                            {c.category}
                          </Link>
                        </td>
                        <td className="num">{formatMoney(c.total)}</td>
                        <td className="num text-slate-500">{c.percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.categories.length === 0 && <p className="p-6 text-center text-slate-500">No expenses in this range.</p>}
              </TableCard>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold">Monthly breakdown</h3>
                <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5" role="group" aria-label="Monthly breakdown range">
                  {MONTHLY_BREAKDOWN_RANGES.map((range) => (
                    <button key={range} type="button" onClick={() => setMonthlyBreakdownRange(range)}
                      aria-pressed={monthlyBreakdownRange === range}
                      className={`rounded px-2.5 py-1 text-xs font-medium ${monthlyBreakdownRange === range
                        ? "bg-indigo-600 text-white"
                        : "text-slate-600 hover:bg-slate-100"}`}>
                      {range} months
                    </button>
                  ))}
                </div>
              </div>
              <p className="mb-2 text-xs text-slate-500">Select a month to view the transactions behind the totals.</p>
              <TableCard>
                <table className="data-table">
                  <thead>
                    <tr><th>Month</th><th className="num">Income</th><th className="num">Expenses</th><th className="num">Savings</th><th className="num">Rate</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => (
                      <tr key={m.key}>
                        <td className="whitespace-nowrap font-medium">
                          <Link to={periodLink(m.key, metric)} className="text-indigo-700 hover:underline"
                            aria-label={`View ${monthLabel(m.key)} transactions`}>
                            {monthLabel(m.key)}
                          </Link>
                        </td>
                        <td className="num text-green-600">{formatMoney(m.income)}</td>
                        <td className="num text-red-600">{formatMoney(m.expenses)}</td>
                        <td className={`num ${m.savings < 0 ? "text-red-600" : ""}`}>{formatMoney(m.savings)}</td>
                        <td className="num text-slate-500">{m.income > 0 ? `${Math.round((m.savings / m.income) * 100)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableCard>
            </div>
          </div>
        </>
      )}
    </div>
  );
}