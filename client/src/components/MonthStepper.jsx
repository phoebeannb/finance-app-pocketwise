import { ChevronLeft, ChevronRight } from "lucide-react";
import { monthNow, shiftMonth, monthLabel } from "../utils/months";

export default function MonthStepper({ month, onChange }) {
  const isCurrent = month === monthNow();
  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5" role="group" aria-label="Month">
        <button type="button" onClick={() => onChange(shiftMonth(month, -1))} aria-label="Previous month"
          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"><ChevronLeft size={18} aria-hidden="true" /></button>
        <span className="min-w-32 px-2 text-center text-sm font-medium" aria-live="polite">{monthLabel(month)}</span>
        <button type="button" onClick={() => onChange(shiftMonth(month, 1))} disabled={isCurrent} aria-label="Next month"
          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"><ChevronRight size={18} aria-hidden="true" /></button>
      </div>
      {!isCurrent && (
        <button type="button" onClick={() => onChange(monthNow())} className="text-sm font-medium text-indigo-700 hover:underline">This month</button>
      )}
    </div>
  );
}