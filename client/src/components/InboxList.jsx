import { useCallback, useEffect, useState } from "react";
import { GripVertical } from "lucide-react";
import api from "../api/axios";
import useCategories from "../hooks/useCategories";
import { usePrefs } from "../context/PreferencesContext";
import { formatMoney } from "../utils/format";
import { relativeDay } from "../utils/datetime";
import { CategoryBadge } from "./CategoryLabel";
import { card } from "./ui";

const LAST_KEY = "pw_last_account";

export default function InboxList({ limit = 6, refreshKey = 0, onChanged }) {
  const [data, setData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [frequent, setFrequent] = useState({ expense: [], income: [] });
  const [selected, setSelected] = useState(null);
  const [over, setOver] = useState("");
  const [busy, setBusy] = useState(false);
  const { expense, income } = useCategories();
  const { prefs } = usePrefs();

  const load = useCallback(
    () => api.get("/transactions/inbox", { params: { limit } })
      .then(({ data }) => setData(data))
      .catch(() => setData({ count: 0, items: [] })),
    [limit]
  );
  useEffect(() => { load(); }, [load, refreshKey]);
  useEffect(() => {
    api.get("/accounts").then(({ data }) => setAccounts(data)).catch(() => {});
    api.get("/transactions/frequent").then(({ data }) => setFrequent(data)).catch(() => {});
  }, [refreshKey]);

  if (!data || data.count === 0) return null;

  const activeId = selected && data.items.some((i) => i._id === selected) ? selected : data.items[0]._id;
  const active = data.items.find((i) => i._id === activeId);

  let lastUsed = "";
  try { lastUsed = localStorage.getItem(LAST_KEY) || ""; } catch { /* storage blocked */ }
  const fallbackAccount = [prefs.defaultAccount, lastUsed].find((id) => id && accounts.some((a) => a._id === id)) || "";

  const targets = [];
  for (const c of [active.suggestion, ...(frequent[active.type] || []), ...(active.type === "income" ? income : expense)]) {
    if (c && !targets.some((x) => x.toLowerCase() === c.toLowerCase())) targets.push(c);
  }
  const shown = targets.slice(0, 8);
  const rest = targets.slice(8);

  const file = async (item, category) => {
    if (busy) return;
    setBusy(true);
    try {
      await api.put(`/transactions/${item._id}`, {
        type: item.type, amount: item.amount, category, description: item.description || "", notes: item.notes || "",
        tags: item.tags || [], mood: item.mood || "", date: item.date,
        account: item.account?._id || fallbackAccount || null, toAccount: null, fee: 0,
      }, { successMessage: `Filed under ${category}.` });
      setSelected(null);
      await load();
      onChanged?.();
    } catch { /* the red message explains what to fix */ } finally {
      setBusy(false);
      setOver("");
    }
  };

  const drop = (e, category) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    const item = data.items.find((i) => i._id === id) || active;
    file(item, category);
  };

  return (
    <section className={`${card} p-4 sm:p-5`} aria-labelledby="inbox-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="inbox-title" className="text-lg font-semibold">
          Inbox <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 align-middle text-xs font-semibold text-amber-900">{data.count} waiting</span>
        </h3>
        <p className="text-sm text-slate-600">Drag a card onto a category, or tap a card and then a category.</p>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <ul className="space-y-2" aria-label="Waiting for a category">
          {data.items.map((item) => {
            const on = item._id === activeId;
            return (
              <li key={item._id}>
                <button type="button" draggable aria-pressed={on}
                  onDragStart={(e) => { setSelected(item._id); e.dataTransfer.setData("text/plain", item._id); e.dataTransfer.effectAllowed = "move"; }}
                  onClick={() => setSelected(item._id)}
                  className={`flex w-full cursor-grab items-center gap-3 rounded-lg border p-3 text-left active:cursor-grabbing ${
                    on ? "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500" : "border-slate-200 bg-white hover:border-slate-300"
                  }`}>
                  <GripVertical size={16} className="shrink-0 text-slate-500" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">{item.description || "No description"}</span>
                    <span className="block text-xs text-slate-600">{relativeDay(item.date)}</span>
                  </span>
                  <span className={`shrink-0 font-semibold ${item.type === "income" ? "text-green-700" : "text-red-700"}`}>
                    {item.type === "income" ? "+" : "-"}{formatMoney(item.amount)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div role="group" aria-label={`Choose a category for ${active.description || "the selected item"}`}>
          <p className="mb-2 text-sm font-medium text-slate-800">
            {active.description || "This item"} goes in…
            {fallbackAccount && <span className="font-normal text-slate-600"> (from {accounts.find((a) => a._id === fallbackAccount)?.name})</span>}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {shown.map((c) => (
              <button type="button" key={c} disabled={busy} onClick={() => file(active, c)}
                onDragOver={(e) => { e.preventDefault(); setOver(c); }} onDragLeave={() => setOver("")} onDrop={(e) => drop(e, c)}
                className={`flex items-center gap-2 rounded-lg border p-2 text-left text-sm disabled:opacity-60 ${
                  over === c ? "border-indigo-600 bg-indigo-100"
                  : c === active.suggestion ? "border-amber-400 bg-amber-50"
                  : "border-slate-200 bg-white hover:border-indigo-400 hover:bg-indigo-50"
                }`}>
                <CategoryBadge t={{ type: active.type, category: c }} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-900">{c}</span>
                  {c === active.suggestion && <span className="block text-xs text-amber-800">Suggested</span>}
                </span>
              </button>
            ))}
          </div>
          {rest.length > 0 && (
            <select aria-label="More categories" value="" onChange={(e) => e.target.value && file(active, e.target.value)} disabled={busy}
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="">More categories…</option>
              {rest.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
        </div>
      </div>

      {data.count > data.items.length && (
        <p className="mt-3 text-xs text-slate-600">{data.count - data.items.length} more waiting. They move up here as you file these.</p>
      )}
    </section>
  );
}