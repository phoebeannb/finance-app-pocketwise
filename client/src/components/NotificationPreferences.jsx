import { useEffect, useState } from "react";
import api from "../api/axios";

const labels = { bills: "Upcoming and overdue bills", budgets: "Budget warnings", balances: "Negative wallet balances", debts: "Open debts" };
export default function NotificationPreferences() {
  const [values, setValues] = useState(null);
  useEffect(() => { api.get("/notifications/preferences").then(({ data }) => setValues(data)); }, []);
  if (!values) return <p className="text-sm text-slate-500">Loading notification preferences...</p>;
  const update = async (key, value) => { const next = { ...values, [key]: value }; setValues(next); await api.put("/notifications/preferences", next); };
  return <div className="space-y-3">{Object.entries(labels).map(([key, label]) => <label key={key} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-3 text-sm"><span>{label}</span><input type="checkbox" checked={values[key] !== false} onChange={(e) => update(key, e.target.checked)} /></label>)}</div>;
}
