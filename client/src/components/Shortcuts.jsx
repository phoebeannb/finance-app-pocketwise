import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import Modal from "./Modal";

const PAGES = [
  ["Overview", "/"], ["Accounts", "/accounts"], ["Transactions", "/transactions"], ["Budgets", "/budgets"],
  ["Bills", "/bills"], ["Goals", "/goals"], ["Reports", "/reports"], ["Settings", "/settings"],
];
const LIST = [
  ["N", "Add a transaction"],
  ["Ctrl + K", "Open the command palette (jump anywhere, or search)"],
  ["Ctrl + Z", "Undo the last delete"],
  ["?", "Show this list"],
  ["Esc", "Close a window"],
];

const isTyping = (el) => !!el && (["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName) || el.isContentEditable);

export default function Shortcuts({ onAdd, onLogout }) {
  const navigate = useNavigate();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuery("");
        setActive(0);
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTyping(e.target) || document.querySelector('[role="dialog"]')) return;
      if (e.key === "n" || e.key === "N") { e.preventDefault(); onAdd(); }
      else if (e.key === "?") { e.preventDefault(); setHelpOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAdd]);

  const commands = useMemo(() => {
    const all = [
      { label: "Add a transaction", hint: "N", run: onAdd },
      ...PAGES.map(([label, to]) => ({ label: `Go to ${label}`, run: () => navigate(to) })),
      { label: "Open inbox (uncategorized)", run: () => navigate("/transactions?inbox=1") },
      { label: "Show keyboard shortcuts", hint: "?", run: () => setHelpOpen(true) },
      { label: "Log out", run: onLogout },
    ];
    const q = query.trim().toLowerCase();
    const found = q ? all.filter((c) => c.label.toLowerCase().includes(q)) : all;
    if (q) found.push({ label: `Search transactions for “${query.trim()}”`, run: () => navigate(`/transactions?q=${encodeURIComponent(query.trim())}`) });
    return found;
  }, [query, navigate, onAdd, onLogout]);

  const choose = (c) => {
    setPaletteOpen(false);
    setTimeout(c.run, 0); // after the window has closed and given focus back
  };

  const onInputKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(commands.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" && commands[active]) { e.preventDefault(); choose(commands[active]); }
  };

  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active]);

  return (
    <>
      <Modal open={paletteOpen} onClose={() => setPaletteOpen(false)} title="Command palette" size="max-w-lg">
        <div className="relative">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setActive(0); }} onKeyDown={onInputKey}
            role="combobox" aria-expanded="true" aria-controls="palette-list" aria-activedescendant={`palette-${active}`}
            aria-label="Type a command or something to search for" placeholder="Type a command, or search your transactions"
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
        </div>
        <ul id="palette-list" ref={listRef} role="listbox" className="mt-3 max-h-72 overflow-y-auto">
          {commands.map((c, i) => (
            <li key={c.label} id={`palette-${i}`} role="option" aria-selected={i === active}
              onMouseEnter={() => setActive(i)} onClick={() => choose(c)}
              className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm ${i === active ? "bg-indigo-50 text-indigo-900" : "text-slate-700"}`}>
              <span>{c.label}</span>
              {c.hint && <kbd className="rounded border border-slate-300 bg-white px-1.5 text-xs text-slate-600">{c.hint}</kbd>}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">Use ↑ ↓ to move, Enter to choose, Esc to close.</p>
      </Modal>

      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Keyboard shortcuts" size="max-w-sm">
        <dl className="divide-y divide-slate-100 text-sm">
          {LIST.map(([keys, what]) => (
            <div key={keys} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-slate-700">{what}</dt>
              <dd><kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-xs font-medium text-slate-700">{keys}</kbd></dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-slate-500">Letter shortcuts are off while you're typing in a field.</p>
      </Modal>
    </>
  );
}