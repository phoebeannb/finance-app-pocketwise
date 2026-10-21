import { formatMoney } from "./format";
import { isSavings } from "./txDisplay";

export function txAccount(t) {
  if (t.type === "transfer" && !isSavings(t)) return `${t.account?.name || "—"} → ${t.toAccount?.name || "—"}`;
  return (t.account || t.toAccount)?.name || "—";
}

// Shown in grey italics when the person didn't write a description
const AUTO_LABEL = {
  "food & dining": "Food Purchase",
  "transportation": "Transport Fare",
  "shopping": "Shopping Purchase",
  "bills & utilities": "Bill Payment",
  "entertainment": "Entertainment Spending",
  "healthcare": "Health Expense",
  "education": "Learning Expense",
  "groceries": "Grocery Shopping",
  "personal care": "Personal care expense",
  "insurance": "Insurance Payment",
  "rent/mortgage": "Rent or mortgage payment",
  "savings & investment": "Savings/Investment",
  "gift & donations": "Gift/Donation",
  "travel": "Travel Expense",
  "subscriptions": "Subscription Payment",
  "pets": "Pet Expense",
  "other": "Other Expense",
  "transfer fees": "Transfer fee",
  "salary": "Salary",
  "business income": "Business Income",
  "freelance/gig": "Freelance or gig payment",
  "investment returns": "Investment return",
  "rental income": "Rental Income",
  "bonus/commission": "Bonus/Commission",
  "gift/inheritance": "Gift/Inheritance",
  "refund": "Refund",
  "other income": "Other Income",
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