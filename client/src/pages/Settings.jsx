import { useSearchParams } from "react-router-dom";
import { User, SlidersHorizontal, Tags, CreditCard, ShieldCheck } from "lucide-react";
import ProfileInfo from "../components/ProfileInfo";
import PreferencesPanel from "../components/PreferencesPanel";
import CategoriesManager from "../components/CategoriesManager";
import CardsManager from "../components/CardsManager";
import DataPrivacy from "../components/DataPrivacy";

const TABS = [
  ["profile", "Profile Info", User, ProfileInfo],
  ["preferences", "Preferences", SlidersHorizontal, PreferencesPanel],
  ["categories", "Categories", Tags, CategoriesManager],
  ["cards", "Cards", CreditCard, CardsManager],
  ["data", "Data & privacy", ShieldCheck, DataPrivacy],
];

export default function Settings() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.some(([v]) => v === params.get("tab")) ? params.get("tab") : "profile";
  const Active = TABS.find(([v]) => v === tab)[3];

  return (
    <div className="w-full">
      <h2 className="mb-6 text-2xl font-semibold">Settings</h2>

      <div className="mb-6 inline-flex flex-wrap rounded-lg border border-slate-200 bg-white p-0.5">
        {TABS.map(([value, label, Icon]) => (
          <button key={value} onClick={() => setParams({ tab: value }, { replace: true })}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium ${tab === value ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      <Active />
    </div>
  );
}