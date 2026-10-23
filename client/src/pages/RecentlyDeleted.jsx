import { useEffect, useState } from "react";
import { ArchiveRestore, Clock3, Trash2 } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { toast } from "../utils/toast";
import ConfirmModal from "../components/ConfirmModal";
import { Empty, ErrorBar, card } from "../components/ui";

const labels = { transaction: "Transaction", account: "Account", bill: "Bill", budget: "Budget", goal: "Goal", debt: "Utang" };
const titleOf = (item) => item.data.description || item.data.name || item.data.person || item.data.category || "Deleted item";
const detailOf = (item) => item.data.amount ? formatMoney(item.data.amount) : item.data.amountOwed ? formatMoney(item.data.amountOwed) : "";

export default function RecentlyDeleted() {
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [permanent, setPermanent] = useState(null);
  const load = () => api.get("/deleted-items").then(({ data }) => setItems(data))
    .catch(() => setError("Could not load Recently Deleted."));
  useEffect(() => { load(); }, []);
  const restore = async (item) => {
    try {
      await api.post(`/deleted-items/${item._id}/restore`);
      setItems((list) => list.filter((entry) => entry._id !== item._id));
      toast.success(`${titleOf(item)} restored.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not restore this item.");
    }
  };
  const deleteForever = async () => {
    await api.delete(`/deleted-items/${permanent._id}`);
    setItems((list) => list.filter((entry) => entry._id !== permanent._id));
    setPermanent(null);
    toast.success("Item permanently deleted.");
  };
  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold">Recently Deleted</h2>
        <p className="mt-1 text-sm text-slate-600">Restore deleted PocketWise records within 30 days.</p>
      </div>
      {error && <ErrorBar message={error} onRetry={load} />}
      {!error && !items.length && <Empty icon={ArchiveRestore} title="Nothing recently deleted">Deleted transactions, accounts, bills, budgets, goals, and Utang records will appear here.</Empty>}
      <div className="space-y-3">
        {items.map((item) => (
          <article key={item._id} className={`${card} flex flex-wrap items-center gap-4 p-4`}>
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600"><Trash2 size={18} /></span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{titleOf(item)}</div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                <span>{labels[item.type]}</span>{detailOf(item) && <span>· {detailOf(item)}</span>}
                <span>· <Clock3 className="inline" size={13} /> Delete after {new Date(new Date(item.deletedAt).getTime() + 30 * 86400000).toLocaleDateString("en-PH")}</span>
              </div>
            </div>
            <button type="button" onClick={() => restore(item)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"><ArchiveRestore size={15} /> Restore</button>
            <button type="button" onClick={() => setPermanent(item)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">Delete forever</button>
          </article>
        ))}
      </div>
      <ConfirmModal open={!!permanent} title="Delete forever?" message={`"${permanent ? titleOf(permanent) : ""}" cannot be restored after permanent deletion.`} onClose={() => setPermanent(null)} onConfirm={deleteForever} />
    </div>
  );
}
