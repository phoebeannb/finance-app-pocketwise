import { useEffect, useState } from "react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import TrendChart from "../components/TrendChart";

const PERIODS = [["daily", "Daily"], ["weekly", "Weekly"], ["monthly", "Monthly"], ["yearly", "Yearly"]];
const RANGE = {
  daily: "Last 30 days",
  weekly: "Last 12 weeks (weeks start on Monday)",
  monthly: "Last 12 months",
  yearly: "Last 5 years",
};
const METRICS = {
  expenses: { name: "Expenses", color: "#dc2626", text: "text-red-600", ring: "ring-red-300" },
  income: { name: "Income", color: "#16a34a", text: "text-green-600", ring: "ring-green-300" },
  savings: { name: "Savings", color: "#4f46e5", text: "text-indigo-600", ring: "ring-indigo-300" },
};

export default function Reports() {
  const [period, setPeriod] = useState("monthly");
  const [metric, setMetric] = useState("expenses");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/reports", { params: { period } })
      .then(({ data }) => { setData(data); setError(""); })
      .catch(() => setError("Could not load the report"));
  }, [period]);

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Reports</h2>
        <div className="inline-flex rounded-xl bg-white p-1 shadow-sm">
          {PERIODS.map(([value, label]) => (
            <button key={value} onClick={() => setPeriod(value)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium ${period === value ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mb-4 text-red-600">{error}</p>}
      {!data && !error && <p>Loading...</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {Object.entries(METRICS).map(([key, m]) => (
              <button key={key} onClick={() => setMetric(key)}
                className={`rounded-2xl bg-white p-5 text-left shadow-sm ${metric === key ? `ring-2 ${m.ring}` : ""}`}>
                <div className="text-sm text-slate-500">{m.name}</div>
                <div className={`mt-1 truncate text-2xl font-semibold ${key === "savings" && data.totals.savings < 0 ? "text-red-600" : m.text}`}>
                  {formatMoney(data.totals[key])}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold">{METRICS[metric].name} over time</h3>
            <p className="mb-2 text-xs text-slate-500">{RANGE[period]} · tap a card above to switch</p>
            <TrendChart kind="bar" data={data.series}
              series={[{ key: metric, name: METRICS[metric].name, color: METRICS[metric].color }]} />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-lg font-semibold">Category Breakdown</h3>
              {data.categories.length === 0 ? (
                <p className="text-slate-500">No expenses in this range.</p>
              ) : (
                <ul className="space-y-3">
                  {data.categories.map((c) => (
                    <li key={c.category}>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">{c.category}</span>
                        <span className="text-slate-600">{formatMoney(c.total)} · {c.percent}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-indigo-500" style={{ width: `${c.percent}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-lg font-semibold">Monthly Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-slate-500">
                      <th className="py-2 pr-3 font-medium">Month</th>
                      <th className="py-2 pr-3 text-right font-medium">Income</th>
                      <th className="py-2 pr-3 text-right font-medium">Expenses</th>
                      <th className="py-2 pr-3 text-right font-medium">Savings</th>
                      <th className="py-2 text-right font-medium">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...data.monthly].reverse().map((m) => (
                      <tr key={m.key} className="border-b border-slate-50">
                        <td className="py-2 pr-3 font-medium">{m.label}</td>
                        <td className="py-2 pr-3 text-right text-green-600">{formatMoney(m.income)}</td>
                        <td className="py-2 pr-3 text-right text-red-600">{formatMoney(m.expenses)}</td>
                        <td className={`py-2 pr-3 text-right ${m.savings < 0 ? "text-red-600" : "text-slate-800"}`}>{formatMoney(m.savings)}</td>
                        <td className="py-2 text-right text-slate-500">{m.income > 0 ? `${Math.round((m.savings / m.income) * 100)}%` : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}