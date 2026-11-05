import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import BrandLogo from "../components/BrandLogo";
import Skeleton from "../components/Skeleton";
import { Empty, ErrorBar, card } from "../components/ui";

export default function Investments() {
  const [accounts, setAccounts] = useState(null);
  const [error, setError] = useState("");

  const load = () => api.get("/accounts")
    .then(({ data }) => { setAccounts(data.filter((account) => account.type === "Investment")); setError(""); })
    .catch((err) => setError(err.response ? "Could not load investments." : "Can't reach the server. Make sure it's running, then try again."));

  useEffect(() => { load(); }, []);

  if (error) return <ErrorBar message={error} onRetry={load} />;
  if (!accounts) return <Skeleton className="h-40" />;

  const total = accounts.reduce((sum, account) => sum + (account.currentBalance || 0), 0);
  return (
    <div className="w-full">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Investments</h2>
          <p className="mt-1 text-sm text-slate-600">Track the current value of your investment accounts.</p>
        </div>
        <Link to="/accounts?create=investment" className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700">Add investment account</Link>
      </div>
      <div className={`${card} mb-5 flex items-center gap-4 p-5`}>
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700"><TrendingUp size={21} /></span>
        <div><p className="text-sm text-slate-600">Total investments</p><p className="text-3xl font-bold">{formatMoney(total)}</p></div>
      </div>
      {accounts.length === 0 ? (
        <Empty icon={TrendingUp} title="No investment accounts yet">
          Add an account with the Investment type to see it here.
        </Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <Link key={account._id} to="/accounts" className={`${card} flex items-center gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md`}>
              <BrandLogo name={account.provider} label={account.name} />
              <div className="min-w-0"><p className="truncate font-semibold">{account.name}</p><p className="mt-1 text-xl font-bold">{formatMoney(account.currentBalance)}</p></div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
