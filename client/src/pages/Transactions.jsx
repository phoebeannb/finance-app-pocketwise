import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, SlidersHorizontal, Upload, X, ChevronLeft, ChevronRight, Inbox } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { fmtDateTime, fmtTime, relativeDay, todayKey } from "../utils/datetime";
import { isSavings, txTitle } from "../utils/txDisplay";
import { txAccount, txNote, hasNote, txSign, txColor } from "../utils/txTable";
import { moodOf } from "../utils/moods";
import useCategories from "../hooks/useCategories";
import TransactionModal from "../components/TransactionModal";
import ConfirmModal from "../components/ConfirmModal";
import ImportModal from "../components/ImportModal";
import InboxList from "../components/InboxList";
import CategoryLabel from "../components/CategoryLabel";
import Modal from "../components/Modal";
import Skeleton from "../components/Skeleton";
import { IconButton, TableCard, ErrorBar } from "../components/ui";

const PAGE_SIZE = 20;
const TYPE_TABS = [["all", "All"], ["income", "Income"], ["expense", "Expense"], ["transfer", "Transfer"]];
const emptyFilters = { q: "", type: "all", category: "", account: "", from: "", to: "", min: "", max: "" };
const DISMISS_KEY = "pw_inbox_dismissed";

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function readDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISS_KEY)); } catch { return null; }
}

// A full sentence that says exactly what is about to be deleted
function deleteMessage(t) {
  if (!t) return "";
  if (isSavings(t))
    return "Are you sure you want to delete this savings entry? The amount will also be taken back out of the goal.";
  return `Are you sure you want to delete this transaction? (${txSign(t)}${formatMoney(t.amount)} · ${txTitle(t)} · ${relativeDay(t.date)}) This can't be undone.`;
}

export default function Transactions() {
  const [params] = useSearchParams();
  const [filters, setFilters] = useState(emptyFilters);
  const [unsorted, setUnsorted] = useState(params.get("inbox") === "1");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState("");

  const [inbox, setInbox] = useState(null);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [inboxTick, setInboxTick] = useState(0);
  const [dismissed, setDismissed] = useState(readDismissed);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const { expense, income } = useCategories();
  const allCats = useMemo(() => [...new Set([...expense, ...income])].sort((a, b) => a.localeCompare(b)), [expense, income]);

  const dq = useDebounced(filters.q);
  const dmin = useDebounced(filters.min);
  const dmax = useDebounced(filters.max);

  const update = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const clearAll = () => { setFilters(emptyFilters); setUnsorted(false); setPage(1); };

  const queryParams = useMemo(() => ({
    q: dq || undefined,
    type: filters.type === "all" ? undefined : filters.type,
    category: filters.category || undefined,
    account: filters.account || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    min: dmin || undefined,
    max: dmax || undefined,
    uncategorized: unsorted ? "1" : undefined,
    page,
    pageSize: PAGE_SIZE,
  }), [dq, dmin, dmax, filters.type, filters.category, filters.account, filters.from, filters.to, unsorted, page]);

  const load = useCallback(
    () => api.get("/transactions/search", { params: queryParams })
      .then(({ data }) => { setData(data); setError(""); })
      .catch((err) => setError(err.response ? "Could not load transactions." : "Can't reach the server. Make sure it's running, then try again.")),
    [queryParams]
  );
  const loadInbox = useCallback(
    () => api.get("/transactions/inbox", { params: { limit: 1 } })
      .then(({ data }) => setInbox({ count: data.count, yesterday: data.yesterday }))
      .catch(() => {}),
    []
  );
  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadInbox(); }, [loadInbox]);
  useEffect(() => { api.get("/accounts").then(({ data }) => setAccounts(data)).catch(() => {}); }, []);

  const reloadAll = () => { load(); loadInbox(); setInboxTick((k) => k + 1); };

  useEffect(() => {
    if (data && data.pages > 0 && page > data.pages) setPage(data.pages);
  }, [data, page]);

  // Close the sorting window once the inbox is empty
  useEffect(() => {
    if (inboxOpen && inbox && inbox.count === 0) setInboxOpen(false);
  }, [inboxOpen, inbox]);

  const activeCount = [filters.category, filters.account, filters.from, filters.to, filters.min, filters.max].filter(Boolean).length;
  const hasAnyFilter = activeCount > 0 || filters.q || filters.type !== "all" || unsorted;
  const start = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const end = data ? start + data.items.length - 1 : 0;

  // A gentle, dismissible nudge. It comes back tomorrow, or sooner if more items pile up.
  const bannerVisible =
    inbox && inbox.count > 0 && !unsorted &&
    !(dismissed && dismissed.day === todayKey() && inbox.count <= dismissed.count);
  const dismissBanner = () => {
    const v = { day: todayKey(), count: inbox.count };
    localStorage.setItem(DISMISS_KEY, JSON.stringify(v));
    setDismissed(v);
  };
  const bannerText = inbox
    ? inbox.yesterday > 0
      ? `You have ${plural(inbox.yesterday, "uncategorized transaction")} from yesterday.${inbox.count > inbox.yesterday ? ` ${inbox.count - inbox.yesterday} older ${inbox.count - inbox.yesterday === 1 ? "one is" : "ones are"} waiting too.` : ""}`
      : `You have ${plural(inbox.count, "uncategorized transaction")} waiting in your inbox.`
    : "";

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (t) => { setEditing(t); setModalOpen(true); };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Transactions</h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
            <Upload size={16} /> Import CSV
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus size={16} /> Add Transaction
          </button>
        </div>
      </div>

      {error && <ErrorBar message={error} onRetry={load} />}

      {bannerVisible && (
        <div role="status" className="mb-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span aria-hidden="true">💡</span>
          <p className="flex-1">
            {bannerText}{" "}
            <button onClick={() => setInboxOpen(true)} className="font-medium underline hover:text-amber-950">
              Click here to quickly sort them.
            </button>
          </p>
          <button onClick={dismissBanner} aria-label="Dismiss this notice" className="shrink-0 rounded p-0.5 text-amber-700 hover:bg-amber-100">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-60 flex-1">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={filters.q} onChange={(e) => update({ q: e.target.value })} placeholder="Search description or category"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          {filters.q && (
            <button onClick={() => update({ q: "" })} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          {TYPE_TABS.map(([value, label]) => (
            <button key={value} onClick={() => update({ type: value })}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${filters.type === value ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => { setUnsorted((u) => !u); setPage(1); }} aria-pressed={unsorted}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${unsorted ? "border-amber-500 bg-amber-50 text-amber-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
          <Inbox size={16} /> Inbox {inbox?.count > 0 && `(${inbox.count})`}
        </button>
        <button onClick={() => setShowFilters((s) => !s)}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${showFilters || activeCount ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
          <SlidersHorizontal size={16} /> Filters {activeCount > 0 && `(${activeCount})`}
        </button>
      </div>

      {showFilters && (
        <div className="mb-4 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 xl:grid-cols-3">
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
            <button onClick={clearAll} className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">Clear all filters</button>
          </div>
        </div>
      )}

      {data && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
          <span>{data.total === 0 ? "No results" : `Showing ${start}–${end} of ${data.total}`}{hasAnyFilter && data.total > 0 && " (filtered)"}</span>
          <span>
            Income <span className="font-semibold text-green-600">{formatMoney(data.totals.income)}</span>
            {" · "}Expenses <span className="font-semibold text-red-600">{formatMoney(data.totals.expenses)}</span>
          </span>
        </div>
      )}

      {!data && !error && <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10" />)}</div>}

      {data && (
        <TableCard>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th><th>Category</th><th>Description</th><th>Account</th>
                <th className="text-center" title="How you were feeling">Mood</th>
                <th className="num">Amount</th><th className="actions" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => {
                const mood = moodOf(t.mood);
                return (
                  <tr key={t._id}>
                    <td className="whitespace-nowrap" title={fmtDateTime(t.date)}>
                      <div className="font-medium text-slate-700">{relativeDay(t.date)}</div>
                      {fmtTime(t.date) && <div className="text-xs text-slate-500">{fmtTime(t.date)}</div>}
                    </td>
                    <td><CategoryLabel t={t} /></td>
                    <td className={`max-w-[260px] truncate ${hasNote(t) ? "text-slate-600" : "italic text-slate-400"}`} title={txNote(t)}>
                      {txNote(t)}
                    </td>
                    <td className="text-slate-600">{txAccount(t)}</td>
                    <td className="text-center text-lg">
                      {mood && <span role="img" aria-label={mood.label} title={mood.label}>{mood.emoji}</span>}
                    </td>
                    <td className={`num font-semibold ${txColor(t)}`}>{txSign(t)}{formatMoney(t.amount)}</td>
                    <td className="actions">
                      {!isSavings(t) && <IconButton icon={Pencil} label="Edit" onClick={() => openEdit(t)} />}
                      <IconButton icon={Trash2} label="Delete" danger onClick={() => setToDelete(t)} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {data.items.length === 0 && (
            <div className="p-6 text-center text-slate-500">
              {hasAnyFilter
                ? <>Nothing matches those filters. <button onClick={clearAll} className="font-medium text-indigo-600 hover:underline">Clear filters</button></>
                : "No transactions yet. Add one or import a CSV."}
            </div>
          )}
          {data.pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1 text-sm font-medium hover:bg-slate-50 disabled:opacity-40">
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-sm text-slate-500">Page {data.page} of {data.pages}</span>
              <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages}
                className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-1 text-sm font-medium hover:bg-slate-50 disabled:opacity-40">
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </TableCard>
      )}

      <TransactionModal open={modalOpen} editing={editing} onClose={() => setModalOpen(false)} onSaved={reloadAll} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={reloadAll} />

      <Modal open={inboxOpen} onClose={() => setInboxOpen(false)} title="Sort your inbox" size="max-w-5xl">
        <InboxList limit={20} refreshKey={inboxTick} onChanged={reloadAll} />
      </Modal>

      <ConfirmModal
        open={!!toDelete}
        title="Delete transaction"
        message={deleteMessage(toDelete)}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { await api.delete(`/transactions/${toDelete._id}`); reloadAll(); }}
      />
    </div>
  );
}