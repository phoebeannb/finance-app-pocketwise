import { formatMoney } from "./format";
import { isSavings } from "./txDisplay";

export function txAccount(t) {
  if (t.type === "transfer" && !isSavings(t)) return `${t.account?.name || "—"} → ${t.toAccount?.name || "—"}`;
  return (t.account || t.toAccount)?.name || "—";
}

export function txNote(t) {
  const parts = [];
  if (t.description) parts.push(t.description);
  if (t.fee > 0) parts.push(`fee ${formatMoney(t.fee)}`);
  return parts.join(" · ") || "—";
}

export const txSign = (t) => (t.type === "income" ? "+" : t.type === "expense" ? "-" : "");
export const txColor = (t) => (t.type === "income" ? "text-green-600" : t.type === "transfer" ? "text-slate-700" : "text-red-600");