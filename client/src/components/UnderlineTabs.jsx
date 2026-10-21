export default function UnderlineTabs({ value, onChange, options, label }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-x-6 border-b border-slate-200">
      {options.map(([v, text]) => (
        <button key={v} type="button" onClick={() => onChange(v)} aria-pressed={value === v}
          className={`-mb-px border-b-2 px-0.5 pb-2 pt-1 text-sm font-medium ${
            value === v
              ? "border-indigo-600 text-slate-900"
              : "border-transparent text-slate-600 hover:border-slate-400 hover:text-slate-900"
          }`}>
          {text}
        </button>
      ))}
    </div>
  );
}