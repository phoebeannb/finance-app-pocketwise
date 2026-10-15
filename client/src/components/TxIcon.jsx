import {
  Briefcase, Store, Laptop, TrendingUp, Building2, Award, Gift, Undo2, Banknote,
  Utensils, Car, ShoppingBag, Receipt, Film, HeartPulse, GraduationCap, ShoppingCart,
  Sparkles, ShieldCheck, PiggyBank, Plane, Repeat, PawPrint, Tag, ArrowLeftRight,
} from "lucide-react";
import { isSavings } from "../utils/txDisplay";

const ICONS = {
  "salary": Briefcase, "business income": Store, "freelance/gig": Laptop, "investment returns": TrendingUp,
  "rental income": Building2, "bonus/commission": Award, "gift/inheritance": Gift, "refund": Undo2,
  "other income": Banknote,
  "food & dining": Utensils, "transportation": Car, "shopping": ShoppingBag, "bills & utilities": Receipt,
  "entertainment": Film, "healthcare": HeartPulse, "education": GraduationCap, "groceries": ShoppingCart,
  "personal care": Sparkles, "insurance": ShieldCheck, "rent/mortgage": Building2,
  "savings & investment": PiggyBank, "gift & donations": Gift, "travel": Plane, "subscriptions": Repeat,
  "pets": PawPrint, "other": Tag, "transfer fees": Receipt,
  // older category names
  "food": Utensils, "transport": Car, "bills": Receipt, "health": HeartPulse,
};

export default function TxIcon({ t }) {
  let Icon = Tag;
  let color = "bg-slate-100 text-slate-600";

  if (isSavings(t)) {
    Icon = PiggyBank;
    color = "bg-indigo-100 text-indigo-600";
  } else if (t.type === "transfer") {
    Icon = ArrowLeftRight;
    color = "bg-indigo-100 text-indigo-600";
  } else {
    Icon = ICONS[(t.category || "").toLowerCase()] || (t.type === "income" ? Banknote : Tag);
    color = t.type === "income" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600";
  }

  return (
    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${color}`}>
      <Icon size={18} />
    </span>
  );
}