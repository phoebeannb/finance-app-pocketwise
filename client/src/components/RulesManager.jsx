import { useCallback, useEffect, useState } from "react";
import { Trash2, ArrowRight } from "lucide-react";
import api from "../api/axios";
import ConfirmModal from "./ConfirmModal";

export default function RulesManager() {
  const [rules, setRules] = useState(null);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState(null);

  const load = useCallback(
    () => api.get("/rules").then(({ data }) => setRules(data)).catch(() => setError("Could not load rules")),
    []
  );
  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-2xl rounded-2xl bg-white p-5 shadow-sm">
      <h3 className="text-lg font-semibold">Import rules</h3>
      <p className="mb-4 text-sm text-slate-500">
        When a CSV description contains the words on the left, that category is filled in automatically.
        Rules are created when you change a category during an import.
      </p>

      {error && <p className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
      {rules && rules.length === 0 && <p className="text-slate-500">No rules yet. Import a CSV and change a category to create one.</p>}

      <ul className="divide-y divide-slate-100">
        {rules?.map((r) => (
          <li key={r._id} className="flex items-center gap-3 py-2.5">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.type === "income" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
              {r.type}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">“{r.keyword}”</span>
            <ArrowRight size={16} className="shrink-0 text-slate-400" />
            <span className="w-40 shrink-0 truncate text-slate-700">{r.category}</span>
            <button onClick={() => setToDelete(r)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label="Delete rule">
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>

      <ConfirmModal
        open={!!toDelete}
        message={`Delete the rule “${toDelete?.keyword}” → ${toDelete?.category}?`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { await api.delete(`/rules/${toDelete._id}`); load(); }}
      />
    </div>
  );
}