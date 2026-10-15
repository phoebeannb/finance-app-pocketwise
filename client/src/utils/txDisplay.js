import { formatMoney } from "./format";
import { fmtDateTime } from "./datetime";

export const isSavings = (t) => t.type === "transfer" && t.category === "Savings";

export function txTitle(t) {
  if (isSavings(t)) return t.account || t.account?._id ? "Savings deposit" : "Savings withdrawal";
  if (t.type === "transfer") return "Transfer";
  return t.category || "Uncategorized";
}

export function txSubtitle(t) {
  const parts = [];
  if (t.type === "transfer" && !isSavings(t)) {
    parts.push(`${t.account?.name || "—"} → ${t.toAccount?.name || "—"}`);
    if (t.description) parts.push(t.description);
    if (t.fee > 0) parts.push(`fee ${formatMoney(t.fee)}`);
  } else {
    if (t.description) parts.push(t.description);
    const acc = t.account || t.toAccount;
    if (acc?.name) parts.push(acc.name);
  }
  parts.push(fmtDateTime(t.date));
  return parts.join(" · ");
}