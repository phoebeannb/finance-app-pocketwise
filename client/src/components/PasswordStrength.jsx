    import { checkPassword } from "../utils/passwordPolicy";

export default function PasswordStrength({ password, email, name }) {
  if (!password) return null;
  const rules = checkPassword(password, { email, name });
  const passed = rules.filter((r) => r.ok).length;
  const pct = (passed / rules.length) * 100;
  const color = pct < 50 ? "bg-red-500" : pct < 100 ? "bg-amber-500" : "bg-green-500";
  const word = pct < 50 ? "Weak" : pct < 100 ? "Almost there" : "Strong";

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div className={`h-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs font-medium text-slate-600">{word}</span>
      </div>
      <ul className="grid gap-1 text-xs">
        {rules.map((r) => (
          <li key={r.label} className={r.ok ? "text-green-600" : "text-slate-400"}>
            {r.ok ? "✓" : "○"} {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}