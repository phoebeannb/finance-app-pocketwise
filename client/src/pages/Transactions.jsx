import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Plus, Pencil, Trash2, List, ArrowDownLeft, ArrowUpRight, ArrowLeftRight,
  Search, SlidersHorizontal, Upload, X, ChevronLeft, ChevronRight, WifiOff,
} from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { isSavings, txTitle, txSubtitle } from "../utils/txDisplay";
import useCategories from "../hooks/useCategories";
import TransactionModal from "../components/TransactionModal";
import ConfirmModal from "../components/ConfirmModal";
import ImportModal from "../components/ImportModal";
import TxIcon from "../components/TxIcon";
import Skeleton from "../components/Skeleton";

const PAGE_SIZE = 20;
const TYPE_TABS = [
  ["all", "All", List],
  ["income", "Income", ArrowDownLeft],
  ["expense", "Expense", ArrowUpRight],
  ["transfer", "Transfer", ArrowLeftRight],
];
const emptyFilters = { q: "", type: "all", category: "", account: "", from: "", to: "", min: "", max: "" };

const field =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function Transactions() {
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const { expense, income } = useCategories();
  const allCats = useMemo(() => [...new Set([...expense, ...income])].sort((a, b) => a.localeCompare(b)), [expense, income]);

  const dq = useDebounced(filters.q);
  const dmin = useDebounced(filters.min);
  const dmax = useDebounced(filters.max);

  const update = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };
  const clearAll = () => { setFilters(emptyFilters); setPage(1); };

  const params = useMemo(() => ({
    q: dq || undefined,
    type: filters.type === "all" ? undefined : filters.type,
    category: filters.category || undefined,
    account: filters.account || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    min: dmin || undefined,
    max: dmax || undefined,
    page,
    pageSize: PAGE_SIZE,
  }), [dq, dmin, dmax, filters.type, filters.category, filters.account, filters.from, filters.to, page]);

  const load = useCallback(
    () => api.get("/transactions/search", { params })
      .then(({ data }) => { setData(data); setError(""); })
      .catch((err) => setError(err.response ? "Could not load transactions." : "Can't reach the server. Make sure it's running, then try again.")),
    [params]
  );
  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/accounts").then(({ data }) => setAccounts(data)).catch(() => {}); }, []);

  // If the last item on a page is deleted, step back a page
  useEffect(() => {
    if (data && data.pages > 0 && page > data.pages) setPage(data.pages);
  }, [data, page]);

  const activeCount = [filters.category, filters.account, filters.from, filters.to, filters.min, filters.max].filter(Boolean).length;
  const hasAnyFilter = activeCount > 0 || filters.q || filters.type !== "all";
  const start = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const end = data ? start + data.items.length - 1 : 0;

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (t) => { setEditing(t); setModalOpen(true); };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Transactions</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50">
            <Upload size={18} /> Import CSV
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700">
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

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={filters.q} onChange={(e) => update({ q: e.target.value })} placeholder="Search description or category"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100" />
          {filters.q && (
            <button onClick={() => update({ q: "" })} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100">
              <X size={14} />
            </button>
          )}
        </div>
        <button onClick={() => setShowFilters((s) => !s)}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shadow-sm ${showFilters || activeCount ? "bg-indigo-600 text-white" : "bg-white text-slate-700 hover:bg-slate-100"}`}>
          <SlidersHorizontal size={16} /> Filters
          {activeCount > 0 && <span className="rounded-full bg-white px-1.5 text-xs font-semibold text-indigo-600">{activeCount}</span>}
        </button>
      </div>

      <div className="mb-3 inline-flex flex-wrap rounded-xl bg-white p-1 shadow-sm">
        {TYPE_TABS.map(([value, label, Icon]) => (
          <button key={value} onClick={() => update({ type: value })}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium ${filters.type === value ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {showFilters && (
        <div className="mb-4 grid gap-3 rounded-2xl bg-white p-4 shadow-sm sm:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
            <select value={filters.category} onChange={(e) => update({ category: e.target.value })} className={field}>
              <option value="">All categories</option>
              {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Account</label>
            <select value={filters.account} onChange={(e) => update({ account: e.target.value })} className={field}>
              <option value="">All accounts</option>
              {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Min amount</label>
              <input type="number" min="0" step="0.01" value={filters.min} onChange={(e) => update({ min: e.target.value })} placeholder="0" className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500">Max amount</label>
              <input type="number" min="0" step="0.01" value={filters.max} onChange={(e) => update({ max: e.target.value })} placeholder="Any" className={field} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">From date</label>
            <input type="date" value={filters.from} onChange={(e) => update({ from: e.target.value })} className={field} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">To date</label>
            <input type="date" value={filters.to} onChange={(e) => update({ to: e.target.value })} className={field} />
          </div>
          <div className="flex items-end">
            <button onClick={clearAll} className="w-full rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium hover:bg-slate-200">Clear all filters</button>
          </div>
        </div>
      )}

      {data && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
          <span>
            {data.total === 0 ? "No results" : `Showing ${start}–${end} of ${data.total}`}
            {hasAnyFilter && data.total > 0 && " (filtered)"}
          </span>
          <span>
            Income <span className="font-semibold text-green-600">{formatMoney(data.totals.income)}</span>
            {" · "}Expenses <span className="font-semibold text-red-600">{formatMoney(data.totals.expenses)}</span>
          </span>
        </div>
      )}

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        {!data && !error && (
          <div className="space-y-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12" />)}</div>
        )}
        {data && data.items.length === 0 && (
          <div className="py-6 text-center text-slate-500">
            {hasAnyFilter ? (
              <>
                Nothing matches those filters.{" "}
                <button onClick={clearAll} className="font-medium text-indigo-600 hover:underline">Clear filters</button>
              </>
            ) : "No transactions yet. Add one, or import a CSV."}
          </div>
        )}
        <ul className="divide-y divide-slate-100">
          {data?.items.map((t) => (
            <li key={t._id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <TxIcon t={t} />
                <div className="min-w-0">
                  <div className="font-medium">{txTitle(t)}</div>
                  <div className="truncate text-sm text-slate-500">{txSubtitle(t)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`mr-1 font-semibold ${t.type === "income" ? "text-green-600" : t.type === "transfer" ? "text-indigo-600" : "text-red-600"}`}>
                  {t.type === "income" ? "+" : t.type === "expense" ? "-" : ""}{formatMoney(t.amount)}
                </span>
                {!isSavings(t) && (
                  <button onClick={() => openEdit(t)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200">
                    <Pencil size={14} /> Edit
                  </button>
                )}
                <button onClick={() => setToDelete(t)} className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1 text-sm text-red-600 hover:bg-red-100">
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        {data && data.pages > 1 && (
          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium hover:bg-slate-200 disabled:opacity-40">
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="text-sm text-slate-500">Page {data.page} of {data.pages}</span>
            <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages}
              className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium hover:bg-slate-200 disabled:opacity-40">
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <TransactionModal open={modalOpen} editing={editing} onClose={() => setModalOpen(false)} onSaved={load} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={load} />

      <ConfirmModal
        open={!!toDelete}
        message={
          toDelete && isSavings(toDelete)
            ? "Delete this savings entry? The amount also comes back out of the goal."
            : "Delete this transaction?"
        }
        onClose={() => setToDelete(null)}
        onConfirm={async () => { await api.delete(`/transactions/${toDelete._id}`); load(); }}
      />
    </div>
  );
}