import {
  Utensils, Car, ShoppingBag, Receipt, Film, HeartPulse, GraduationCap, ShoppingCart, Sparkles, ShieldCheck,
  PiggyBank, Plane, Repeat, PawPrint, Tag, Briefcase, Store, Laptop, TrendingUp, Building2, Award, Gift, Undo2,
  Banknote, ArrowLeftRight, Home, Ticket, Music, Dumbbell, Inbox,
} from "lucide-react";
import { isSavings, txTitle } from "../utils/txDisplay";

const CATEGORY = {
  "food & dining": [Utensils, "bg-orange-100 text-orange-800"],
  "transportation": [Car, "bg-sky-100 text-sky-800"],
  "shopping": [ShoppingBag, "bg-pink-100 text-pink-800"],
  "bills & utilities": [Receipt, "bg-amber-100 text-amber-800"],
  "entertainment": [Film, "bg-violet-100 text-violet-800"],
  "healthcare": [HeartPulse, "bg-red-100 text-red-800"],
  "education": [GraduationCap, "bg-indigo-100 text-indigo-800"],
  "groceries": [ShoppingCart, "bg-green-100 text-green-800"],
  "personal care": [Sparkles, "bg-fuchsia-100 text-fuchsia-800"],
  "insurance": [ShieldCheck, "bg-teal-100 text-teal-800"],
  "rent/mortgage": [Home, "bg-stone-200 text-stone-800"],
  "savings & investment": [PiggyBank, "bg-emerald-100 text-emerald-800"],
  "gift & donations": [Gift, "bg-rose-100 text-rose-800"],
  "travel": [Plane, "bg-cyan-100 text-cyan-800"],
  "subscriptions": [Repeat, "bg-purple-100 text-purple-800"],
  "pets": [PawPrint, "bg-yellow-100 text-yellow-800"],
  "other": [Tag, "bg-slate-200 text-slate-800"],
  "transfer fees": [Receipt, "bg-slate-200 text-slate-800"],
  "salary": [Briefcase, "bg-green-100 text-green-800"],
  "business income": [Store, "bg-emerald-100 text-emerald-800"],
  "freelance/gig": [Laptop, "bg-teal-100 text-teal-800"],
  "investment returns": [TrendingUp, "bg-emerald-100 text-emerald-800"],
  "rental income": [Building2, "bg-lime-100 text-lime-800"],
  "bonus/commission": [Award, "bg-yellow-100 text-yellow-800"],
  "gift/inheritance": [Gift, "bg-pink-100 text-pink-800"],
  "refund": [Undo2, "bg-sky-100 text-sky-800"],
  "other income": [Banknote, "bg-green-100 text-green-800"],
  // older category names
  "food": [Utensils, "bg-orange-100 text-orange-800"],
  "transport": [Car, "bg-sky-100 text-sky-800"],
  "bills": [Receipt, "bg-amber-100 text-amber-800"],
  "health": [HeartPulse, "bg-red-100 text-red-800"],
};

// A brand in the description wins over the category, so Netflix gets a film ticket
const BRANDS = [
  [/netflix|disney|hbo|viu|prime video|youtube premium/i, Ticket, "bg-violet-100 text-violet-800"],
  [/spotify|apple music|tidal/i, Music, "bg-green-100 text-green-800"],
  [/gym|fitness|crossfit/i, Dumbbell, "bg-orange-100 text-orange-800"],
  [/grab|angkas|joyride|move it/i, Car, "bg-sky-100 text-sky-800"],
];

export function categoryVisual(t) {
  if (isSavings(t)) return [PiggyBank, "bg-emerald-100 text-emerald-800"];
  if (t.type === "transfer") return [ArrowLeftRight, "bg-slate-200 text-slate-800"];
  if (!t.category) return [Inbox, "bg-amber-100 text-amber-800"];
  const brand = BRANDS.find(([re]) => re.test(t.description || ""));
  if (brand) return [brand[1], brand[2]];
  return CATEGORY[t.category.toLowerCase()] || [Tag, "bg-slate-200 text-slate-800"];
}

export function CategoryBadge({ t, size = "md" }) {
  const [Icon, cls] = categoryVisual(t);
  const small = size === "sm";
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-lg ${small ? "h-8 w-8" : "h-10 w-10"} ${cls}`}>
      <Icon size={small ? 16 : 20} />
    </span>
  );
}

export default function CategoryLabel({ t }) {
  return (
    <span className="inline-flex items-center gap-2 font-medium">
      <CategoryBadge t={t} size="sm" />
      {txTitle(t)}
    </span>
  );
}