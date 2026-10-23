import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatMoney } from "../utils/format";

const pad = (n) => String(n).padStart(2, "0");
const keyOf = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export default function BillCalendar({ items, month, onMonthChange, onSelect }) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return date;
  });
  const byDay = items.reduce((map, item) => {
    const key = item.nextDate.slice(0, 10);
    map[key] = [...(map[key] || []), item];
    return map;
  }, {});
  const title = month.toLocaleDateString("en-PH", { month: "long", year: "numeric" });

  return (
    <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm" aria-labelledby="bill-calendar-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 id="bill-calendar-title" className="text-lg font-semibold">Bill calendar</h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onMonthChange(-1)} aria-label="Previous month" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><ChevronLeft size={18} /></button>
          <span className="min-w-32 text-center text-sm font-medium">{title}</span>
          <button type="button" onClick={() => onMonthChange(1)} aria-label="Next month" className="rounded-md p-2 text-slate-600 hover:bg-slate-100"><ChevronRight size={18} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center text-xs font-semibold uppercase text-slate-500">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day} className="py-2">{day}</div>)}
        {cells.map((date) => {
          const key = keyOf(date);
          const entries = byDay[key] || [];
          const inMonth = date.getMonth() === month.getMonth();
          return (
            <div key={key} className={`min-h-16 border-t border-slate-100 p-1 text-left ${inMonth ? "" : "bg-slate-50 text-slate-400"}`}>
              <div className="text-xs">{date.getDate()}</div>
              {entries.map((item) => (
                <button key={item._id} type="button" onClick={() => onSelect(item)}
                  className="mt-1 block w-full truncate rounded bg-indigo-50 px-1 py-0.5 text-left text-[11px] font-medium text-indigo-800 hover:bg-indigo-100"
                  title={`${item.name} · ${formatMoney(item.amount)}`}>
                  {item.name}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </section>
  );
}
