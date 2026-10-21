import { useEffect, useState } from "react";

const pctText = (p) => (p > 0 && p < 1 ? p.toFixed(1) : Math.round(p));

export default function Ring({ pct, done, size = 84, stroke = 8, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [offset, setOffset] = useState(c);
  useEffect(() => {
    const t = setTimeout(() => setOffset(c * (1 - Math.min(100, pct) / 100)), 60);
    return () => clearTimeout(t);
  }, [pct, c]);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label || `${pctText(pct)} percent`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={done ? "#15803d" : "#255ca3"} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 700ms ease-out" }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-slate-900" aria-hidden="true">
        {done ? "✓" : `${pctText(pct)}%`}
      </div>
    </div>
  );
}