import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import api from "../api/axios";
import Modal from "./Modal";

const pages = [
  ["Overview", "/", "Dashboard"],
  ["Accounts", "/accounts", "Money"],
  ["Transactions", "/transactions", "Money"],
  ["Budgets", "/budgets", "Planning"],
  ["Bills", "/bills", "Planning"],
  ["Goals", "/goals", "Planning"],
  ["Reports", "/reports", "Analysis"],
  ["Settings", "/settings", "Settings"],
  ["Profile settings", "/settings?tab=profile", "Settings"],
  ["Preferences", "/settings?tab=preferences", "Settings"],
  ["Categories", "/settings?tab=categories", "Settings"],
  ["Data & Privacy", "/settings?tab=data", "Settings"],
];

export default function GlobalSearchModal({ open, query, onClose, onNavigate }) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || query.length < 2) {
      setResults([]);
      return;
    }
    let active = true;
    setLoading(true);
    api.get("/search", { params: { q: query } })
      .then(({ data }) => { if (active) setResults(data); })
      .catch(() => { if (active) setResults([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, query]);

  const pageResults = pages
    .filter(([title, , group]) => `${title} ${group}`.toLowerCase().includes(query.toLowerCase()))
    .map(([title, path, group]) => ({ id: path, kind: group, title, subtitle: "Open page", path }));
  const allResults = [...pageResults, ...results];

  return (
    <Modal open={open} onClose={onClose} title="Search PocketWise" size="max-w-2xl">
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <Search size={16} aria-hidden="true" />
          <span className="truncate">{query}</span>
        </div>
        {loading && <p className="py-4 text-center text-sm text-slate-500">Searching all sections...</p>}
        {!loading && !allResults.length && <p className="py-6 text-center text-sm text-slate-500">No matching pages or records found.</p>}
        {!loading && allResults.length > 0 && (
          <ul className="max-h-[55vh] divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
            {allResults.map((item) => (
              <li key={`${item.kind}-${item.id}`}>
                <button type="button" onClick={() => onNavigate(item.path)}
                  className="w-full px-3 py-3 text-left hover:bg-indigo-50">
                  <span className="block truncate text-sm font-semibold text-slate-900">{item.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{item.kind} · {item.subtitle}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
