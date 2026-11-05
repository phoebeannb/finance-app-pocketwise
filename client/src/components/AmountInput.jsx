import { Delete, X } from "lucide-react";
import { useState } from "react";
import useMediaQuery from "../hooks/useMediaQuery";
import { formatMoney } from "../utils/format";

export default function AmountInput({ id, value, onChange, className = "", autoFocus = false }) {
  const isTouch = useMediaQuery("(pointer: coarse)");
  const [showPad, setShowPad] = useState(isTouch);
  const update = (next) => onChange({ target: { name: "amount", value: next } });
  const press = (key) => {
    if (key === "backspace") return update(String(value).slice(0, -1));
    if (key === "." && String(value).includes(".")) return;
    update(`${value}${key}`);
  };
  const symbol = formatMoney(0).replace(/[\d.,\s\u00a0-]/g, "") || "$";
  const keys = [["7", "8", "9"], ["4", "5", "6"], ["1", "2", "3"], [".", "0", "backspace"]];

  return (
    <div>
      <div className="relative">
        <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-2xl text-slate-500">{symbol}</span>
        <input id={id} name="amount" type="number" inputMode={isTouch && showPad ? "none" : "decimal"} step="0.01" min="0.01"
          placeholder="0.00" value={value} onChange={onChange} required autoFocus={autoFocus} className={`${className} pl-10`} />
        {value && (
          <button type="button" onClick={() => update("")} aria-label="Clear amount" title="Clear amount"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>
      <button type="button" onClick={() => setShowPad((shown) => !shown)} aria-expanded={showPad}
        className="mt-2 text-xs font-medium text-indigo-700 hover:underline">
        {showPad ? "Use keyboard" : "Show number pad"}
      </button>
      {showPad && (
        <div className="mt-2 grid gap-1.5" aria-label="Amount keypad">
          {keys.map((row, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-3 gap-1.5">
              {row.map((key) => (
                <button type="button" key={key} onClick={() => press(key)}
                  aria-label={key === "." ? "Decimal point" : key === "backspace" ? "Backspace" : key}
                  className="flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm font-semibold text-slate-800 hover:bg-slate-50">
                  {key === "backspace" ? <Delete size={17} aria-hidden="true" /> : key}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
