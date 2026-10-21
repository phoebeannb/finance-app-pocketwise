import { formatMoney } from "./format";
import { isSavings } from "./txDisplay";

export function txAccount(t) {
  if (t.type === "transfer" && !isSavings(t)) return `${t.account?.name || "—"} → ${t.toAccount?.name || "—"}`;
  return (t.account || t.toAccount)?.name || "—";
}

// Shown in grey italics when the person didn't write a description
const AUTO_LABEL = {
  "food & dining": "Meal or food purchase",
  "transportation": "Transport fare or fuel",
  "shopping": "Shopping purchase",
  "bills & utilities": "Bill payment",
  "entertainment": "Entertainment spending",
  "healthcare": "Medical or health expense",
  "education": "School or learning expense",
  "groceries": "Grocery shopping",
  "personal care": "Personal care expense",
  "insurance": "Insurance payment",
  "rent/mortgage": "Rent or mortgage payment",
  "savings & investment": "Savings or investment",
  "gift & donations": "Gift or donation",
  "travel": "Travel expense",
  "subscriptions": "Subscription payment",
  "pets": "Pet expense",
  "other": "Other expense",
  "transfer fees": "Transfer fee",
  "salary": "Salary",
  "business income": "Business income",
  "freelance/gig": "Freelance or gig payment",
  "investment returns": "Investment return",
  "rental income": "Rental income",
  "bonus/commission": "Bonus or commission",
  "gift/inheritance": "Gift or inheritance",
  "refund": "Refund",
  "other income": "Other income",
};

export const hasNote = (t) => !!(t.description && t.description.trim());

export function txNote(t) {
  const parts = [];
  if (hasNote(t)) parts.push(t.description.trim());
  else if (t.type === "transfer") parts.push(isSavings(t) ? "Savings" : "Transfer between accounts");
  else if (!t.category) parts.push("No description provided");
  else parts.push(AUTO_LABEL[t.category.toLowerCase()] || `${t.category} (no description)`);
  if (t.fee > 0) parts.push(`fee ${formatMoney(t.fee)}`);
  return parts.join(" · ");
}

export const txSign = (t) => (t.type === "income" ? "+" : t.type === "expense" ? "-" : "");
export const txColor = (t) => (t.type === "income" ? "text-green-600" : t.type === "transfer" ? "text-slate-700" : "text-red-600");