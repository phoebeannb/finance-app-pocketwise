import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import TransactionModal from "../components/TransactionModal";

const FILTERS = [["all", "All"], ["income", "Income"], ["expense", "Expense"], ["transfer", "Transfer"]];

export default function Transactions() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(
    () => api.get("/transactions").then(({ data }) => setItems(data)).catch(() => setError("Could not load transactions")),
    []
  );
  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (t) => { setEditing(t); setModalOpen(true); };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this transaction?")) return;
    await api.delete(`/transactions/${id}`);
    load();
  };

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

      <div className="mb-4 inline-flex rounded-xl bg-white p-1 shadow-sm">
        {FILTERS.map(([value, label]) => (
          <button key={value} onClick={() => setFilter(value)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium ${filter === value ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-5 shadow-sm">
        {shown.length === 0 && <p className="text-slate-500">No transactions here yet.</p>}
        <ul className="divide-y divide-slate-100">
          {shown.map((t) => {
            const transfer = t.type === "transfer";
            return (
              <li key={t._id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="font-medium">{transfer ? "Transfer" : t.category || "Uncategorized"}</div>
                  <div className="truncate text-sm text-slate-500">
                    {transfer
                      ? `${t.account?.name || "—"} → ${t.toAccount?.name || "—"}`
                      : [t.description, t.account?.name].filter(Boolean).join(" · ")}
                    {" · "}{new Date(t.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-semibold ${t.type === "income" ? "text-green-600" : transfer ? "text-indigo-600" : "text-red-600"}`}>
                    {t.type === "income" ? "+" : transfer ? "" : "-"}{formatMoney(t.amount)}
                  </span>
                  <button onClick={() => openEdit(t)} className="rounded-lg bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200">Edit</button>
                  <button onClick={() => handleDelete(t._id)} className="rounded-lg bg-red-50 px-3 py-1 text-sm text-red-600 hover:bg-red-100">Delete</button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <TransactionModal open={modalOpen} editing={editing} onClose={() => setModalOpen(false)} onSaved={load} />
    </div>
  );
}