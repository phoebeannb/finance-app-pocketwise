import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

// The look of a card, shared everywhere
export const card = "rounded-xl border border-slate-200 bg-white shadow-sm";

export function IconButton({ icon: Icon, label, onClick, danger = false, disabled = false }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={label}
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-md px-2 text-slate-600 disabled:opacity-40 sm:min-h-8 sm:min-w-8 sm:px-1.5 ${danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-slate-100 hover:text-slate-900"}`}>
      <Icon size={16} aria-hidden="true" />
      <span className="text-sm sm:sr-only">{label}</span>
    </button>
  );
}

export function Stat({ label, value, hint, color = "text-slate-900" }) {
  return (
    <div className={`${card} p-4`}>
      <div className="text-sm text-slate-600">{label}</div>
      <div className={`mt-1 truncate text-2xl font-semibold ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-600">{hint}</div>}
    </div>
  );
}

// Cards stand on their own now, so this is just a spacing wrapper
export function TableCard({ children }) {
  return <div className="space-y-2">{children}</div>;
}

// A bar that slides open when it first appears
export function Bar({ pct, color = "bg-indigo-600", height = "h-2", label }) {
  const target = Math.min(100, Math.max(pct > 0 ? 2 : 0, pct));
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW(target), 60);
    return () => clearTimeout(t);
  }, [target]);
  return (
    <div className={`${height} w-full overflow-hidden rounded-full bg-slate-100`} role="progressbar"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, pct))} aria-label={label}>
      <div className={`h-full rounded-full transition-[width] duration-700 ease-out ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

export function Progress({ pct, color = "bg-indigo-600" }) {
  const width = Math.min(100, Math.max(pct > 0 ? 2 : 0, pct));
  return (
    <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100" role="progressbar"
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(Math.min(100, pct))}>
      <div className={`h-full transition-[width] duration-500 ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

// A friendly "nothing here yet" that points to the next step
export function Empty({ icon: Icon, title, children, action }) {
  return (
    <div className={`${card} flex flex-col items-center px-6 py-10 text-center`}>
      {Icon && (
        <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
          <Icon size={24} aria-hidden="true" />
        </span>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {children && <p className="mt-1 max-w-sm text-sm text-slate-600">{children}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function ErrorBar({ message, onRetry }) {
  return (
    <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
      <WifiOff size={18} aria-hidden="true" />
      <span className="flex-1 text-sm">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="rounded-md border border-red-200 bg-white px-3 py-1 text-sm font-medium hover:bg-red-100">
          Try again
        </button>
      )}
    </div>
  );
}