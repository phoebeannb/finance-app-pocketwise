import { MOODS } from "../utils/moods";

// One click picks a mood, a second click on the same one clears it
export default function MoodPicker({ value, onChange }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="How were you feeling?">
      {MOODS.map((m) => {
        const on = value === m.key;
        return (
          <button type="button" key={m.key} onClick={() => onChange(on ? "" : m.key)} aria-pressed={on} title={m.label}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
              on ? "border-indigo-500 bg-indigo-50 font-medium text-indigo-800" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}>
            <span aria-hidden="true" className="text-base leading-none">{m.emoji}</span>
            {m.label}
          </button>
        );
      })}
    </div>
  );
}