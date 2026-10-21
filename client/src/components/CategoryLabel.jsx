import {
  Utensils, Car, ShoppingBag, Receipt, Film, HeartPulse, GraduationCap, ShoppingCart, Sparkles,
  ShieldCheck, PiggyBank, Plane, Repeat, PawPrint, Tag, Briefcase, Store, Laptop, TrendingUp,
  Building2, Award, Gift, Undo2, Banknote, ArrowLeftRight, Home, Ticket, Music, Dumbbell, Inbox,
} from "lucide-react";
import { isSavings, txTitle } from "../utils/txDisplay";

const ICONS = {
  "salary": Briefcase, "business income": Store, "freelance/gig": Laptop, "investment returns": TrendingUp,
  "rental income": Building2, "bonus/commission": Award, "gift/inheritance": Gift, "refund": Undo2, "other income": Banknote,
  "food & dining": Utensils, "transportation": Car, "shopping": ShoppingBag, "bills & utilities": Receipt,
  "entertainment": Film, "healthcare": HeartPulse, "education": GraduationCap, "groceries": ShoppingCart,
  "personal care": Sparkles, "insurance": ShieldCheck, "rent/mortgage": Home, "savings & investment": PiggyBank,
  "gift & donations": Gift, "travel": Plane, "subscriptions": Repeat, "pets": PawPrint, "other": Tag,
  "transfer fees": Receipt,
  // older category names
  "food": Utensils, "transport": Car, "bills": Receipt, "health": HeartPulse,
};

// A brand in the description wins over the category, so Netflix gets a film ticket
const BRANDS = [
  [/netflix|disney|hbo|viu|prime video|youtube premium/i, Ticket],
  [/spotify|apple music|tidal/i, Music],
  [/gym|fitness|crossfit/i, Dumbbell],
  [/grab|angkas|joyride|move it/i, Car],
];

export default function CategoryLabel({ t }) {
  let Icon = Tag;
  let tone = "text-slate-500";

  if (isSavings(t)) Icon = PiggyBank;
  else if (t.type === "transfer") Icon = ArrowLeftRight;
  else if (!t.category) { Icon = Inbox; tone = "text-amber-600"; } // waiting in the inbox
  else {
    const brand = BRANDS.find(([re]) => re.test(t.description || ""));
    Icon = (brand && brand[1]) || ICONS[t.category.toLowerCase()] || Tag;
  }

  return (
    <span className="inline-flex items-center gap-2 font-medium">
      <Icon size={16} className={`shrink-0 ${tone}`} aria-hidden="true" />
      {txTitle(t)}
    </span>
  );
}