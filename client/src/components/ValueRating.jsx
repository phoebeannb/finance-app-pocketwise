const OPTIONS = [
  ["high", "High value", "bg-green-600 text-white"],
  ["neutral", "Neutral", "bg-slate-600 text-white"],
  ["unused", "Unused", "bg-red-600 text-white"],
];

export default function ValueRating({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="How much value do you get from this?"
      className="inline-flex overflow-hidden rounded-md border border-slate-300 text-xs font-medium">
      {OPTIONS.map(([key, label, on]) => (
        <button key={key} type="button" role="radio" aria-checked={value === key} onClick={() => onChange(key)}
          className={`whitespace-nowrap border-l border-slate-300 px-2.5 py-1 first:border-l-0 ${value === key ? on : "bg-white text-slate-600 hover:bg-slate-50"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}