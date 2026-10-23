import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PH_BANK_GROUPS } from "../utils/banks";
import BrandLogo from "./BrandLogo";

export default function BankPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const pick = (o) => {
    onChange(o);
    setOpen(false);
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}
    >
      <button type="button" onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100">
        <span className="flex items-center gap-2">
          {value && <BrandLogo name={value} label={value} size="sm" />}
          <span className={value ? "text-slate-800" : "text-slate-400"}>{value || "Select bank or e-wallet"}</span>
        </span>
        <ChevronDown size={18} className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-10 pt-1">
          <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
            {PH_BANK_GROUPS.map((g) => (
              <div key={g.group}>
                <div className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{g.group}</div>
                {g.options.map((o) => (
                  <button type="button" key={o} onClick={() => pick(o)}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-indigo-50 ${value === o ? "bg-indigo-50 font-medium text-indigo-700" : ""}`}>
                    <BrandLogo name={o} label={o} size="sm" />
                    {o}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}