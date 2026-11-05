import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatMoney } from "../utils/format";
import BrandLogo from "./BrandLogo";

export default function AccountPicker({ id, label, accounts, value, onChange, exclude = [] }) {
  const [open, setOpen] = useState(false);
  const options = accounts.filter((account) => !exclude.includes(account._id));
  const selected = accounts.find((account) => account._id === value);
  return (
    <div className="relative">
      {label && <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>}
      <button id={id} type="button" onClick={() => setOpen((shown) => !shown)} aria-expanded={open} aria-haspopup="listbox"
        className="flex min-h-11 w-full items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left hover:border-slate-400">
        <BrandLogo name={selected?.provider || selected?.name} label={selected?.name} size="sm" />
        <span className="min-w-0 flex-1 truncate text-sm">{selected ? `${selected.name} · ${formatMoney(selected.currentBalance)}` : "Select account"}</span>
        <ChevronDown size={16} className="shrink-0 text-slate-500" aria-hidden="true" />
      </button>
      {open && (
        <div role="listbox" aria-label={label || "Account"} className="absolute inset-x-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
          {options.map((account) => (
            <button type="button" role="option" aria-selected={account._id === value} key={account._id}
              onClick={() => { onChange(account._id); setOpen(false); }}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50">
              <BrandLogo name={account.provider || account.name} label={account.name} size="sm" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{account.name}</span><span className="block text-xs text-slate-500">{account.type} · {formatMoney(account.currentBalance)}</span></span>
            </button>
          ))}
          {!options.length && <p className="p-3 text-sm text-slate-500">No accounts available.</p>}
        </div>
      )}
    </div>
  );
}
