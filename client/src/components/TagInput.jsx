import { useState } from "react";
import { X } from "lucide-react";

export default function TagInput({ value, onChange, max = 5 }) {
  const [text, setText] = useState("");

  const add = (raw) => {
    const t = raw.trim().replace(/^#+/, "").toLowerCase().replace(/\s+/g, "-").slice(0, 20);
    if (!t || value.includes(t) || value.length >= max) return;
    onChange([...value, t]);
  };
  const commit = () => { if (text.trim()) { add(text); setText(""); } };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-300 bg-white px-2 py-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-1 text-sm text-slate-700">
            #{t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove tag ${t}`}
              className="rounded-full p-0.5 hover:bg-slate-200"><X size={12} aria-hidden="true" /></button>
          </span>
        ))}
        {value.length < max && (
          <input value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} aria-label="Add a tag"
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); }
              else if (e.key === "Backspace" && !text && value.length) onChange(value.slice(0, -1));
            }}
            placeholder={value.length ? "" : "e.g. work, trip, gift"}
            className="min-w-24 flex-1 bg-transparent px-1 py-1 text-sm outline-none" />
        )}
      </div>
      <p className="mt-1 text-xs text-slate-500">Press Enter to add a tag. Up to {max}.</p>
    </div>
  );
}