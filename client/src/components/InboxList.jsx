import { useCallback, useEffect, useState } from "react";
import api from "../api/axios";
import useCategories from "../hooks/useCategories";
import { usePrefs } from "../context/PreferencesContext";
import { formatMoney } from "../utils/format";
import { fmtDateTime } from "../utils/datetime";
import { TableCard } from "./ui";

const small = "w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-indigo-500";

export default function InboxList({ limit = 8, refreshKey = 0, onChanged }) {
  const [data, setData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [edits, setEdits] = useState({});
  const [busy, setBusy] = useState("");
  const { expense, income } = useCategories();
  const { prefs } = usePrefs();

  const load = useCallback(
    () => api.get("/transactions/inbox", { params: { limit } })
      .then(({ data }) => setData(data))
      .catch(() => setData({ count: 0, items: [] })),
    [limit]
  );
  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => { api.get("/accounts").then(({ data }) => setAccounts(data)).catch(() => {}); }, [refreshKey]);

  const defaultAccount = accounts.some((a) => a._id === prefs.defaultAccount) ? prefs.defaultAccount : "";
  const catOf = (t) => edits[t._id]?.category ?? t.suggestion ?? "";
  const accOf = (t) => edits[t._id]?.account ?? defaultAccount;
  const set = (id, patch) => setEdits((e) => ({ ...e, [id]: { ...e[id], ...patch } }));

  const save = async (t) => {
    setBusy(t._id);
    try {
      await api.put(`/transactions/${t._id}`, {
        type: t.type, amount: t.amount, category: catOf(t), description: t.description || "",
        date: t.date, account: accOf(t) || null, toAccount: null, fee: 0, mood: t.mood || "",
      }, { successMessage: "Moved out of your inbox." });
      await load();
      onChanged?.();
    } catch { /* the red message explains what to fix */ } finally {
      setBusy("");
    }
  };

  if (!data || data.count === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-lg font-semibold">
          Inbox <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 align-middle text-xs font-semibold text-amber-800">{data.count}</span>
        </h3>
        <p className="text-xs text-slate-500">Pick a category and account to file each one. Filed items count toward budgets and reports.</p>
      </div>
      <TableCard>
        <table className="data-table">
          <thead>
            <tr><th>Date</th><th>Description</th><th className="num">Amount</th><th className="w-52">Category</th><th className="w-44">Account</th><th className="actions" /></tr>
          </thead>
          <tbody>
            {data.items.map((t) => {
              const base = t.type === "income" ? income : expense;
              const chosen = catOf(t);
              const options = chosen && !base.some((c) => c.toLowerCase() === chosen.toLowerCase()) ? [chosen, ...base] : base;
              return (
                <tr key={t._id}>
                  <td className="whitespace-nowrap text-slate-500">{fmtDateTime(t.date)}</td>
                  <td>{t.description || <span className="italic text-slate-400">No description</span>}</td>
                  <td className={`num font-semibold ${t.type === "income" ? "text-green-600" : "text-red-600"}`}>
                    {t.type === "income" ? "+" : "-"}{formatMoney(t.amount)}
                  </td>
                  <td>
                    <select value={chosen} onChange={(e) => set(t._id, { category: e.target.value })} className={small}>
                      <option value="">Choose category</option>
                      {options.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {t.suggestion && chosen === t.suggestion && <div className="mt-0.5 text-xs text-amber-600">Suggested</div>}
                  </td>
                  <td>
                    <select value={accOf(t)} onChange={(e) => set(t._id, { account: e.target.value })} className={small}>
                      <option value="">No account</option>
                      {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
                    </select>
                  </td>
                  <td className="actions">
                    <button onClick={() => save(t)} disabled={!chosen || busy === t._id}
                      className="rounded-md bg-indigo-600 px-3 py-1 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-40">
                      {busy === t._id ? "Saving..." : "File it"}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {data.count > data.items.length && (
          <p className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
            {data.count - data.items.length} more waiting. They move up here as you file these.
          </p>
        )}
      </TableCard>
    </div>
  );
}