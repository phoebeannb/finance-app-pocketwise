import { useEffect, useState } from "react";
import { Building2, HandCoins } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { ErrorBar, Empty, card } from "../components/ui";

export default function AssetsLoans() {
  const [accounts, setAccounts] = useState(null);
  const [error, setError] = useState("");
  const load = () => api.get("/accounts").then(({ data }) => setAccounts(data.filter((a) => ["Asset", "Loan"].includes(a.type)))).catch(() => setError("Could not load assets and loans."));
  useEffect(() => { load(); }, []);
  if (error) return <ErrorBar message={error} onRetry={load} />;
  if (!accounts) return <p className="text-slate-600">Loading...</p>;
  const assets = accounts.filter((a) => a.type === "Asset");
  const loans = accounts.filter((a) => a.type === "Loan");
  const total = (list) => list.reduce((sum, item) => sum + item.currentBalance, 0);
  return <div className="w-full"><div className="mb-6"><h2 className="text-2xl font-semibold">Assets & Loans</h2><p className="mt-1 text-sm text-slate-600">See what you own and what you owe.</p></div>{accounts.length === 0 ? <Empty icon={Building2} title="No assets or loans yet">Create an Asset or Loan account from Wallets.</Empty> : <div className="grid gap-5 lg:grid-cols-2"><section className={`${card} p-5`}><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Assets</h3><b className="text-sky-700">{formatMoney(total(assets))}</b></div>{assets.map((a) => <div key={a._id} className="flex items-center justify-between border-t border-slate-100 py-3"><span className="flex items-center gap-2"><Building2 size={17} className="text-sky-700" />{a.name}</span><b>{formatMoney(a.currentBalance)}</b></div>)}</section><section className={`${card} p-5`}><div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Loans</h3><b className="text-amber-700">{formatMoney(total(loans))}</b></div>{loans.map((a) => <div key={a._id} className="flex items-center justify-between border-t border-slate-100 py-3"><span className="flex items-center gap-2"><HandCoins size={17} className="text-amber-700" />{a.name}</span><b>{formatMoney(a.currentBalance)}</b></div>)}</section></div>}</div>;
}
