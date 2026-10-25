import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plus, Pencil, Trash2, Copy, PiggyBank, Search, SlidersHorizontal, Upload, X, ChevronLeft, ChevronRight, Paperclip, ReceiptText,
} from "lucide-react";
import api from "../api/axios";
import { useQuickAdd } from "../context/QuickAddContext";
import { formatMoney } from "../utils/format";
import { fmtDate, fmtTime, relativeDay } from "../utils/datetime";
import { monthLabel, monthNow } from "../utils/months";
import { isSavings, txTitle } from "../utils/txDisplay";
import { txAccount, txNote, hasNote, txSign, txColor } from "../utils/txTable";
import { moodOf } from "../utils/moods";
import { undoableDelete } from "../utils/undoDelete";
import { toast } from "../utils/toast";
import useCategories from "../hooks/useCategories";
import TransactionModal from "../components/TransactionModal";
import ImportModal from "../components/ImportModal";
import UnderlineTabs from "../components/UnderlineTabs";
import { CategoryBadge } from "../components/CategoryLabel";
import Modal from "../components/Modal";
import Skeleton from "../components/Skeleton";
import { IconButton, Empty, ErrorBar, card } from "../components/ui";

const PAGE_SIZE = 20;
const TYPES = ["income", "expense", "transfer"];
const TYPE_TABS = [["all", "All"], ["income", "Income"], ["expense", "Expense"], ["transfer", "Transfer"]];
const emptyFilters = { q: "", type: "all", category: "", account: "", from: "", to: "", min: "", max: "", tag: "" };

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const dateInput = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// Filters can arrive in the address (clicking a chart, a tag, or the command palette)
function readUrl(params) {
  return {
    filters: {
      ...emptyFilters,
      q: params.get("q") || "",
      type: TYPES.includes(params.get("type")) ? params.get("type") : "all",
      category: params.get("category") || "",
      account: params.get("account") || "",
      from: params.get("from") || "",
      to: params.get("to") || "",
      tag: (params.get("tag") || "").toLowerCase(),
    },
    unsorted: params.get("inbox") === "1",
  };
}

export default function Transactions() {
  const [params] = useSearchParams();
  const { open: openQuickAdd } = useQuickAdd();
  const initial = useMemo(() => readUrl(params), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [filters, setFilters] = useState(initial.filters);
  const [unsorted, setUnsorted] = useState(initial.unsorted);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [receipt, setReceipt] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [duplicateInitial, setDuplicateInitial] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const { expense, income } = useCategories();
  const allCats = useMemo(() => [...new Set([...expense, ...income])].sort((a, b) => a.localeCompare(b)), [expense, income]);

  const dq = useDebounced(filters.q);
  const dmin = useDebounced(filters.min);
  const dmax = useDebounced(filters.max);

  const update = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1); };
  const clearAll = () => { setFilters(emptyFilters); setUnsorted(false); setPage(1); };
  const setPreset = (preset) => {
    const today = new Date();
    if (preset === "month") {
      update({ from: dateInput(new Date(today.getFullYear(), today.getMonth(), 1)), to: dateInput(today) });
    } else if (preset === "30days") {
      const start = new Date(today);
      start.setDate(start.getDate() - 29);
      update({ from: dateInput(start), to: dateInput(today) });
    } else if (preset === "uncategorized") {
      setFilters((f) => ({ ...f, category: "", from: "", to: "", min: "", max: "", tag: "" }));
      setUnsorted(true);
      setPage(1);
    }
  };

  // A new address (for example from the command palette) replaces the filters
  const paramKey = params.toString();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const next = readUrl(params);
    setFilters(next.filters);
    setUnsorted(next.unsorted);
    setPage(1);
  }, [paramKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const queryParams = useMemo(() => ({
    q: dq || undefined,
    type: filters.type === "all" ? undefined : filters.type,
    category: filters.category || undefined,
    account: filters.account || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
    min: dmin || undefined,
    max: dmax || undefined,
    tag: filters.tag || undefined,
    uncategorized: unsorted ? "1" : undefined,
    page,
    pageSize: PAGE_SIZE,
  }), [dq, dmin, dmax, filters.type, filters.category, filters.account, filters.from, filters.to, filters.tag, unsorted, page]);

  const load = useCallback(
    () => api.get("/transactions/search", { params: queryParams })
      .then(({ data }) => { setData(data); setError(""); })
      .catch((err) => setError(err.response ? "Could not load transactions." : "Can't reach the server. Make sure it's running, then try again.")),
    [queryParams]
  );
  useEffect(() => { load(); setSelected(new Set()); }, [load]);
  useEffect(() => { api.get("/accounts").then(({ data }) => setAccounts(data)).catch(() => {}); }, []);

  useEffect(() => {
    if (data && data.pages > 0 && page > data.pages) setPage(data.pages);
  }, [data, page]);

  const groups = useMemo(() => {
    const m = new Map();
    for (const t of data?.items || []) {
      const k = t.date.slice(0, 10);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(t);
    }
    return [...m.entries()];
  }, [data]);

  const activeCount = [filters.category, filters.account, filters.from, filters.to, filters.min, filters.max, filters.tag].filter(Boolean).length;
  const hasAnyFilter = activeCount > 0 || filters.q || filters.type !== "all" || unsorted;
  const start = data ? (data.page - 1) * data.pageSize + 1 : 0;
  const end = data ? start + data.items.length - 1 : 0;

  // What is the list showing right now? Each chip can be removed.
  const accountName = accounts.find((a) => a._id === filters.account)?.name;
  const day = (ymd) => fmtDate(`${ymd}T00:00:00.000Z`);
  const periodLabel = filters.from || filters.to
    ? `${filters.from ? day(filters.from) : "Start"} to ${filters.to ? day(filters.to) : "Today"}`
    : "All transactions";
  const cardsPeriodLabel = filters.from || filters.to ? periodLabel : monthLabel(monthNow());
  const chips = [
    unsorted && { key: "inbox", label: "No category yet", clear: () => { setUnsorted(false); setPage(1); } },
    filters.type !== "all" && { key: "type", label: cap(filters.type), clear: () => update({ type: "all" }) },
    filters.category && { key: "cat", label: filters.category, clear: () => update({ category: "" }) },
    (filters.from || filters.to) && {
      key: "range", label: `${filters.from ? day(filters.from) : "…"} to ${filters.to ? day(filters.to) : "…"}`,
      clear: () => update({ from: "", to: "" }),
    },
    filters.account && { key: "acc", label: accountName || "Account", clear: () => update({ account: "" }) },
    filters.tag && { key: "tag", label: `#${filters.tag}`, clear: () => update({ tag: "" }) },
    filters.q && { key: "q", label: `“${filters.q}”`, clear: () => update({ q: "" }) },
  ].filter(Boolean);

  const reload = () => load();
  const openEdit = (t) => { setDuplicateInitial(null); setEditing(t); setModalOpen(true); };
  const duplicate = (t) => {
    setEditing(null);
    setModalOpen(true);
    setDuplicateInitial({
      type: t.type,
      amount: String(t.amount),
      category: t.category || "",
      description: t.description || "",
      notes: t.notes || "",
      tags: t.tags || [],
      mood: t.mood || "",
      account: t.account?._id || "",
      toAccount: t.toAccount?._id || "",
    });
  };

  // Deleting: it disappears now, and is really deleted after 5 seconds unless you press Undo
  const removeOne = (t) =>
    undoableDelete({
      key: t._id,
      message: isSavings(t)
        ? "Savings entry deleted. The amount comes back out of the goal."
        : `Transaction deleted (${formatMoney(t.amount)} · ${txTitle(t)}).`,
      hide: () => setData((d) => d && { ...d, items: d.items.filter((x) => x._id !== t._id), total: d.total - 1 }),
      restore: load,
      run: () => api.delete(`/transactions/${t._id}`, { quiet: true }),
      done: reload,
    });

  const removeSelected = () => {
    const ids = [...selected];
    const chosen = new Set(ids);
    undoableDelete({
      key: `bulk-${ids.join(",")}`,
      message: `${plural(ids.length, "transaction")} deleted.`,
      hide: () => {
        setData((d) => d && { ...d, items: d.items.filter((x) => !chosen.has(x._id)), total: d.total - ids.length });
        setSelected(new Set());
      },
      restore: load,
      run: () => api.post("/transactions/bulk-delete", { ids }, { quiet: true }),
      done: reload,
    });
  };

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const pageIds = data?.items.map((t) => t._id) || [];
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggleAll = () => setSelected(allOnPage ? new Set() : new Set(pageIds));

  const viewReceipt = async (t) => {
    setReceipt({ t, image: null });
    try {
      const { data: r } = await api.get(`/transactions/${t._id}/receipt`);
      setReceipt({ t, image: r.image });
    } catch {
      setReceipt(null);
      toast.error("We couldn't load that receipt photo. Try again.");
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Transactions</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
            <Upload size={16} aria-hidden="true" /> Import CSV
          </button>
          <button onClick={openQuickAdd}
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
            <Plus size={16} aria-hidden="true" /> Add transaction
          </button>
        </div>
      </div>

      {error && <ErrorBar message={error} onRetry={load} />}

      {data && data.total > 0 && (
        <div className="mb-4" aria-label="Transaction summary">
          <p className="mb-2 text-sm font-medium text-slate-700">{cardsPeriodLabel}</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className={`${card} p-5`}>
            <div className="text-sm text-slate-600">Income</div>
            <div className="mt-2 text-3xl font-semibold text-green-700">{formatMoney(data.totals.income)}</div>
          </div>
          <div className={`${card} p-5`}>
            <div className="text-sm text-slate-600">Expenses</div>
            <div className="mt-2 text-3xl font-semibold text-red-700">{formatMoney(data.totals.expenses)}</div>
          </div>
          <div className={`${card} p-5`}>
            <div className="text-sm text-slate-600">Remaining</div>
            <div className={`mt-2 text-3xl font-semibold ${data.totals.income - data.totals.expenses < 0 ? "text-red-700" : "text-green-700"}`}>
              {formatMoney(data.totals.income - data.totals.expenses)}
            </div>
          </div>
          </div>
        </div>
      )}

      <p className="mb-2 text-sm font-medium text-slate-700">{periodLabel}</p>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <div className="relative min-w-0 flex-1">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input value={filters.q} onChange={(e) => update({ q: e.target.value })} placeholder="Search description, category, notes or tags"
            aria-label="Search transactions"
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
          {filters.q && (
            <button onClick={() => update({ q: "" })} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 hover:bg-slate-100">
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
        <button onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}
          className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${showFilters || activeCount ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
          <SlidersHorizontal size={16} aria-hidden="true" /> Filters {activeCount > 0 && `(${activeCount})`}
        </button>
      </div>

      <div className="mb-4">
        <UnderlineTabs label="Type" value={filters.type} onChange={(type) => update({ type })} options={TYPE_TABS} />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Quick filters">
        <span className="text-xs font-medium text-slate-600">Quick filters:</span>
        <button type="button" onClick={() => setPreset("month")} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-800">This month</button>
        <button type="button" onClick={() => setPreset("30days")} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-800">Last 30 days</button>
        <button type="button" onClick={() => setPreset("uncategorized")} className={`rounded-full border px-3 py-1.5 text-xs font-medium ${unsorted ? "border-indigo-500 bg-indigo-50 text-indigo-800" : "border-slate-300 bg-white text-slate-700 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-800"}`}>Needs category</button>
      </div>

      {showFilters && (
        <div className={`${card} mb-4 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3`}>
          <div>
            <label htmlFor="f-cat" className="mb-1 block text-xs font-medium text-slate-600">Category</label>
            <select id="f-cat" value={filters.category} onChange={(e) => update({ category: e.target.value })} className={field}>
              <option value="">All categories</option>
              {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-acc" className="mb-1 block text-xs font-medium text-slate-600">Account</label>
            <select id="f-acc" value={filters.account} onChange={(e) => update({ account: e.target.value })} className={field}>
              <option value="">All accounts</option>
              {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="f-tag" className="mb-1 block text-xs font-medium text-slate-600">Tag</label>
            <input id="f-tag" value={filters.tag} onChange={(e) => update({ tag: e.target.value.replace(/^#/, "").toLowerCase() })} placeholder="e.g. trip" className={field} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="f-min" className="mb-1 block text-xs font-medium text-slate-600">Min amount</label>
              <input id="f-min" type="number" min="0" step="0.01" value={filters.min} onChange={(e) => update({ min: e.target.value })} placeholder="0" className={field} />
            </div>
            <div>
              <label htmlFor="f-max" className="mb-1 block text-xs font-medium text-slate-600">Max amount</label>
              <input id="f-max" type="number" min="0" step="0.01" value={filters.max} onChange={(e) => update({ max: e.target.value })} placeholder="Any" className={field} />
            </div>
          </div>
          <div>
            <label htmlFor="f-from" className="mb-1 block text-xs font-medium text-slate-600">From date</label>
            <input id="f-from" type="date" value={filters.from} onChange={(e) => update({ from: e.target.value })} className={field} />
          </div>
          <div>
            <label htmlFor="f-to" className="mb-1 block text-xs font-medium text-slate-600">To date</label>
            <input id="f-to" type="date" value={filters.to} onChange={(e) => update({ to: e.target.value })} className={field} />
          </div>
        </div>
      )}

      {chips.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2" aria-label="Active filters">
          <span className="text-sm text-slate-600">Showing:</span>
          {chips.map((c) => (
            <span key={c.key} className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white py-0.5 pl-3 pr-1 text-sm text-slate-800">
              {c.label}
              <button onClick={c.clear} aria-label={`Remove filter ${c.label}`} className="rounded-full p-1 text-slate-600 hover:bg-slate-100">
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          ))}
          <button onClick={clearAll} className="text-sm font-medium text-indigo-700 hover:underline">Clear all</button>
        </div>
      )}

      {data && data.total > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" checked={allOnPage} onChange={toggleAll} className="h-4 w-4 accent-indigo-600" />
            Select all on this page
          </label>
          <span className="text-sm text-slate-600">Showing {start}–{end} of {data.total}</span>
        </div>
      )}

      {selected.size > 0 && (
        <div role="region" aria-label="Selected transactions"
          className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm">
          <span className="font-medium text-indigo-900">{plural(selected.size, "transaction")} selected</span>
          <button onClick={removeSelected} className="rounded-md border border-red-300 bg-white px-3 py-1.5 font-medium text-red-700 hover:bg-red-50">Delete selected</button>
          <button onClick={() => setSelected(new Set())} className="rounded-md px-3 py-1.5 font-medium text-indigo-800 hover:underline">Clear selection</button>
        </div>
      )}

      {!data && !error && <div className="space-y-3">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16" />)}</div>}

      {data && data.items.length === 0 && (
        hasAnyFilter ? (
          <Empty icon={Search} title="Nothing matches those filters"
            action={<button onClick={clearAll} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">Clear filters</button>}>
            Try a wider date range or remove a filter.
          </Empty>
        ) : (
          <Empty icon={ReceiptText} title="No transactions yet"
            action={
              <>
                <button onClick={openQuickAdd} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Add your first transaction</button>
                <button onClick={() => setImportOpen(true)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">Import a CSV</button>
              </>
            }>
            Log what you spend and earn. Everything shows up here, newest first.
          </Empty>
        )
      )}

      {groups.map(([ymd, rows]) => {
        const rel = relativeDay(rows[0].date);
        const full = fmtDate(rows[0].date);
        const totals = data.daily?.[ymd];
        return (
          <section key={ymd} className="mb-5" aria-label={rel === full ? full : `${rel}, ${full}`}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 px-1">
              <h3 className="text-sm font-semibold text-slate-900">
                {rel === full ? full : <>{rel} <span className="font-normal text-slate-600">· {full}</span></>}
              </h3>
              {totals && (totals.expenses > 0 || totals.income > 0) && (
                <span className="text-sm text-slate-600">
                  {totals.expenses > 0 && <>Spent <b className="text-red-700">{formatMoney(totals.expenses)}</b></>}
                  {totals.expenses > 0 && totals.income > 0 && " · "}
                  {totals.income > 0 && <>Earned <b className="text-green-700">{formatMoney(totals.income)}</b></>}
                </span>
              )}
            </div>

            <ul className={`${card} divide-y divide-slate-100 overflow-hidden`}>
              {rows.map((t) => {
                const mood = moodOf(t.mood);
                const meta = [txAccount(t) !== "—" ? txAccount(t) : "", fmtTime(t.date)].filter(Boolean).join(" · ");
                return (
                  <li key={t._id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 hover:bg-slate-50">
                    <input type="checkbox" checked={selected.has(t._id)} onChange={() => toggle(t._id)}
                      aria-label={`Select ${txTitle(t)} ${formatMoney(t.amount)}`} className="h-4 w-4 shrink-0 accent-indigo-600" />
                    <CategoryBadge t={t} />
                    <div className="min-w-0 flex-1 basis-44">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <span className="font-medium text-slate-900">{txTitle(t)}</span>
                        {mood && <span role="img" aria-label={mood.label} title={mood.label}>{mood.emoji}</span>}
                        {t.hasReceipt && (
                          <button onClick={() => viewReceipt(t)} aria-label="View receipt photo" title="View receipt photo"
                            className="rounded p-0.5 text-slate-600 hover:bg-slate-200"><Paperclip size={14} aria-hidden="true" /></button>
                        )}
                      </div>
                      <div className={`truncate text-sm ${hasNote(t) ? "text-slate-700" : "italic text-slate-600"}`} title={txNote(t)}>{txNote(t)}</div>
                      {meta && <div className="text-xs text-slate-600">{meta}</div>}
                      {t.tags?.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {t.tags.map((tag) => (
                            <button key={tag} onClick={() => update({ tag })} title={`Show everything tagged #${tag}`}
                              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 hover:bg-slate-200">#{tag}</button>
                          ))}
                        </div>
                      )}
                      {t.notes && <div className="mt-0.5 truncate text-xs text-slate-600" title={t.notes}>{t.notes}</div>}
                    </div>
                    <div className={`ml-auto shrink-0 text-right text-lg font-semibold ${txColor(t)}`}>{txSign(t)}{formatMoney(t.amount)}</div>
                    <div className="flex w-full justify-end gap-1 sm:w-auto">
                      {!isSavings(t) && <IconButton icon={Pencil} label="Edit" onClick={() => openEdit(t)} />}
                      {!isSavings(t) && <IconButton icon={Copy} label="Duplicate" onClick={() => duplicate(t)} />}
                      {!t.hasReceipt && !isSavings(t) && <IconButton icon={Paperclip} label="Add receipt" onClick={() => openEdit(t)} />}
                      {t.type === "income" && !isSavings(t) && <IconButton icon={PiggyBank} label="Move to a goal" onClick={() => openEdit(t)} />}
                      <IconButton icon={Trash2} label="Delete" danger onClick={() => removeOne(t)} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {data && data.pages > 1 && (
        <div className="mt-2 flex items-center justify-between">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
            className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-40">
            <ChevronLeft size={16} aria-hidden="true" /> Previous
          </button>
          <span className="text-sm text-slate-600">Page {data.page} of {data.pages}</span>
          <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages}
            className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-40">
            Next <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <TransactionModal open={modalOpen} initial={duplicateInitial} editing={editing} onClose={() => setModalOpen(false)} onSaved={reload} />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={reload} />

      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Receipt photo" size="max-w-md">
        {receipt && (
          receipt.image
            ? <img src={receipt.image} alt={`Receipt for ${txTitle(receipt.t)}, ${formatMoney(receipt.t.amount)}`} className="max-h-[70vh] w-full rounded-md object-contain" />
            : <p className="py-8 text-center text-slate-600">Loading...</p>
        )}
      </Modal>
    </div>
  );
}