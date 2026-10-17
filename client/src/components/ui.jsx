import { WifiOff } from "lucide-react";

export function IconButton({ icon: Icon, label, onClick, danger = false, disabled = false }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} title={label} aria-label={label}
      className={`rounded-md p-1.5 text-slate-500 disabled:opacity-40 ${danger ? "hover:bg-red-50 hover:text-red-600" : "hover:bg-slate-100 hover:text-slate-800"}`}>
      <Icon size={16} />
    </button>
  );
}

export function Stat({ label, value, hint, color = "text-slate-900" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 truncate text-2xl font-semibold ${color}`}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export function TableCard({ children }) {
  return <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">{children}</div>;
}

export function Progress({ pct, color = "bg-indigo-600" }) {
  const width = Math.min(100, Math.max(pct > 0 ? 2 : 0, pct));
  return (
    <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full ${color}`} style={{ width: `${width}%` }} />
    </div>
  );
}

export function ErrorBar({ message, onRetry }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
      <WifiOff size={18} />
      <span className="flex-1 text-sm">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="rounded-md border border-red-200 bg-white px-3 py-1 text-sm font-medium hover:bg-red-100">
          Try again
        </button>
      )}
    </div>
  );
}