import { useEffect, useState } from "react";
import { Plus, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import BrandLogo from "../components/BrandLogo";
import Modal from "../components/Modal";
import Skeleton from "../components/Skeleton";
import { Empty, ErrorBar, card } from "../components/ui";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2";
export default function Investments() {
  const [accounts, setAccounts] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ type: "contribution", amount: "", note: "" });
  const [error, setError] = useState("");
  const load = () => api.get("/investments").then(({ data }) => setAccounts(data)).catch(() => setError("Could not load investments."));
  useEffect(() => { load(); }, []);
  const save = async (e) => { e.preventDefault(); try { await api.post(`/investments/${selected._id}/entries`, form); setSelected(null); setForm({ type: "contribution", amount: "", note: "" }); load(); } catch (err) { setError(err.response?.data?.message || "Could not save investment entry."); } };
  if (error && !accounts) return <ErrorBar message={error} onRetry={load} />;
  if (!accounts) return <Skeleton className="h-40" />;
  const total = accounts.reduce((sum, account) => sum + account.currentValue, 0);
  const invested = accounts.reduce((sum, account) => sum + account.netInvested, 0);
  const gain = total - invested;
  return <div className="w-full"><div className="mb-6 flex items-start justify-between gap-3"><div><h2 className="text-2xl font-semibold">Investments</h2><p className="mt-1 text-sm text-slate-600">Track contributions, valuations, gains, and returns.</p></div><Link to="/accounts?create=investment" className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white"><Plus size={16} /> Add account</Link></div><div className={`${card} mb-5 grid gap-4 p-5 sm:grid-cols-3`}><div><p className="text-sm text-slate-600">Current value</p><p className="text-2xl font-bold">{formatMoney(total)}</p></div><div><p className="text-sm text-slate-600">Net invested</p><p className="text-2xl font-bold">{formatMoney(invested)}</p></div><div><p className="text-sm text-slate-600">Gain / loss</p><p className={`text-2xl font-bold ${gain >= 0 ? "text-green-600" : "text-red-600"}`}>{gain >= 0 ? "+" : "-"}{formatMoney(Math.abs(gain))}</p></div></div>{accounts.length === 0 ? <Empty icon={TrendingUp} title="No investment accounts yet">Add an account with the Investment type to see it here.</Empty> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{accounts.map((account) => <div key={account._id} className={`${card} p-4`}><div className="flex items-center gap-3"><BrandLogo name={account.provider} label={account.name} /><div className="min-w-0"><p className="truncate font-semibold">{account.name}</p><p className="text-xl font-bold">{formatMoney(account.currentValue)}</p></div></div><div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div><p className="text-slate-500">Gain / loss</p><p className={account.gain >= 0 ? "font-semibold text-green-600" : "font-semibold text-red-600"}>{account.gain >= 0 ? "+" : "-"}{formatMoney(Math.abs(account.gain))}</p></div><div><p className="text-slate-500">Return</p><p className="font-semibold">{account.returnPct.toFixed(1)}%</p></div></div><button onClick={() => setSelected(account)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"><Plus size={16} /> Add investment entry</button></div>)}</div>}<Modal open={!!selected} onClose={() => setSelected(null)} title={`Add entry · ${selected?.name || ""}`}><form onSubmit={save} className="space-y-3"><select className={field} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option value="contribution">Contribution</option><option value="withdrawal">Withdrawal</option><option value="valuation">Current valuation</option></select><input className={field} type="number" min="0.01" step="0.01" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /><input className={field} placeholder="Note (optional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /><button className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white">Save entry</button></form></Modal></div>;
}
