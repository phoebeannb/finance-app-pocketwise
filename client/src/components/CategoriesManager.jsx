import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import api from "../api/axios";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../utils/categories";
import Modal from "./Modal";
import ConfirmModal from "./ConfirmModal";
import CategoryModal from "./CategoryModal";
import { IconButton, TableCard, ErrorBar } from "./ui";

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

function usesText(u) {
  const parts = [];
  if (u.transactions) parts.push(plural(u.transactions, "transaction"));
  if (u.budgets) parts.push(plural(u.budgets, "budget"));
  if (u.recurring) parts.push(plural(u.recurring, "bill"));
  return parts.length ? parts.join(", ") : "Not used yet";
}

export default function CategoriesManager() {
  const [type, setType] = useState("expense");
  const [cats, setCats] = useState(null);
  const [error, setError] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [renaming, setRenaming] = useState(null);
  const [newName, setNewName] = useState("");
  const [renameError, setRenameError] = useState("");
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(
    () => api.get("/categories", { params: { usage: 1 } })
      .then(({ data }) => { setCats(data); setError(""); })
      .catch((err) => setError(err.response ? "Could not load categories." : "Can't reach the server. Make sure it's running, then try again.")),
    []
  );
  useEffect(() => { load(); }, [load]);

  const builtIn = type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const mine = (cats || []).filter((c) => c.type === type);
  const existing = [...builtIn, ...mine.map((c) => c.name)];

  const openRename = (c) => { setRenaming(c); setNewName(c.name); setRenameError(""); };

  const submitRename = async (e) => {
    e.preventDefault();
    setRenameError("");
    const name = newName.trim().replace(/\s+/g, " ");
    if (!name) return setRenameError("Enter a name");
    if (builtIn.some((b) => b.toLowerCase() === name.toLowerCase())) return setRenameError("That's already a built-in category");
    try {
      await api.put(`/categories/${renaming._id}`, { name });
      setRenaming(null);
      load();
    } catch (err) {
      setRenameError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
          {[["expense", "Expense"], ["income", "Income"]].map(([v, label]) => (
            <button key={v} onClick={() => setType(v)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium ${type === v ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus size={16} /> Add category
        </button>
      </div>

      {error && <ErrorBar message={error} onRetry={load} />}

      <h3 className="mb-2 font-semibold">Your categories</h3>
      <TableCard>
        <table className="data-table">
          <thead><tr><th>Name</th><th>Used in</th><th className="actions" /></tr></thead>
          <tbody>
            {mine.map((c) => (
              <tr key={c._id}>
                <td className="font-medium">{c.name}</td>
                <td className="text-slate-600">{usesText(c.uses || {})}</td>
                <td className="actions">
                  <IconButton icon={Pencil} label="Rename" onClick={() => openRename(c)} />
                  <IconButton icon={Trash2} label="Delete" danger onClick={() => setToDelete(c)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {cats && mine.length === 0 && <p className="p-6 text-center text-slate-500">You haven't added any {type} categories yet.</p>}
        {!cats && !error && <p className="p-6 text-center text-slate-500">Loading...</p>}
      </TableCard>
      <p className="mt-2 text-xs text-slate-500">Renaming also updates your past transactions, budgets and bills.</p>

      <h3 className="mb-2 mt-8 font-semibold">Built-in categories</h3>
      <div className="flex flex-wrap gap-2">
        {builtIn.map((b) => (
          <span key={b} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-600">{b}</span>
        ))}
      </div>
      <p className="mt-2 text-xs text-slate-500">Built-in categories can't be renamed or removed.</p>

      <CategoryModal open={addOpen} type={type} existing={existing} onClose={() => setAddOpen(false)} onCreated={() => load()} />

      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Rename category" size="max-w-sm">
        <form onSubmit={submitRename} className="space-y-3">
          {renameError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{renameError}</p>}
          <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={30} className={field} />
          <button type="submit" className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700">Save name</button>
        </form>
      </Modal>

      <ConfirmModal
        open={!!toDelete}
        message={`Delete the category “${toDelete?.name}”?`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { await api.delete(`/categories/${toDelete._id}`); load(); }}
      />
    </div>
  );
}