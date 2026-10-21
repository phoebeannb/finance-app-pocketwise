import { WifiOff } from "lucide-react";

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
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 truncate text-2xl font-semibold ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

export function TableCard({ children }) {
  return <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">{children}</div>;
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