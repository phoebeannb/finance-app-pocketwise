import { useState } from "react";
import { User, CreditCard } from "lucide-react";
import ProfileInfo from "../components/ProfileInfo";
import CardsManager from "../components/CardsManager";

const TABS = [["profile", "Profile Info", User], ["cards", "Cards", CreditCard]];

export default function Settings() {
  const [tab, setTab] = useState("profile");

  return (
    <div className="w-full">
      <h2 className="mb-6 text-2xl font-bold">Settings</h2>

      <div className="mb-6 inline-flex rounded-xl bg-white p-1 shadow-sm">
        {TABS.map(([value, label, Icon]) => (
          <button key={value} onClick={() => setTab(value)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${tab === value ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "profile" ? <ProfileInfo /> : <CardsManager />}
    </div>
  );
}