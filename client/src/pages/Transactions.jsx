import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, List, ArrowDownLeft, ArrowUpRight, ArrowLeftRight } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { isSavings, txTitle, txSubtitle } from "../utils/txDisplay";
import TransactionModal from "../components/TransactionModal";
import ConfirmModal from "../components/ConfirmModal";
import TxIcon from "../components/TxIcon";

const FILTERS = [
  ["all", "All", List],
  ["income", "Income", ArrowDownLeft],
  ["expense", "Expense", ArrowUpRight],
  ["transfer", "Transfer", ArrowLeftRight],
];

export default function Transactions() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(
    () => api.get("/transactions").then(({ data }) => setItems(data)).catch(() => setError("Could not load transactions")),
    []
  );
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (t) => { setEditing(t); setModalOpen(true); };

  const shown = filter === "all" ? items : items.filter((t) => t.type === filter);

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Transactions</h2>
        <button onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700">
          <Plus size={18} /> Add transaction
        </button>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="mb-4 inline-flex flex-wrap rounded-xl bg-white p-1 shadow-sm">
        {FILTERS.map(([value, label, Icon]) => (
          <button key={value} onClick={() => setFilter(value)}
            className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium ${filter === value ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        {shown.length === 0 && <p className="text-slate-500">No transactions here yet.</p>}
        <ul className="divide-y divide-slate-100">
          {shown.map((t) => (
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
      </div>

      <TransactionModal open={modalOpen} editing={editing} onClose={() => setModalOpen(false)} onSaved={load} />

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