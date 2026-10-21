import { useSearchParams } from "react-router-dom";
import ProfileInfo from "../components/ProfileInfo";
import PreferencesPanel from "../components/PreferencesPanel";
import CategoriesManager from "../components/CategoriesManager";
import DataPrivacy from "../components/DataPrivacy";

const SECTIONS = [
  ["profile", "Profile", "", ProfileInfo],
  ["preferences", "Preferences", "", PreferencesPanel],
  ["categories", "Categories", "", CategoriesManager],
  ["data", "Data & Privacy", "Manage your personal data and account settings.", DataPrivacy],
];

export default function Settings() {
  const [params, setParams] = useSearchParams();
  const key = SECTIONS.some(([k]) => k === params.get("tab")) ? params.get("tab") : "profile";
  const [, , description, Active] = SECTIONS.find(([k]) => k === key);
  const title = SECTIONS.find(([k]) => k === key)[1];

  return (
    <div className="w-full">
      <h2 className="mb-6 text-2xl font-semibold">Settings</h2>

      <div className="flex flex-col gap-6 lg:flex-row">
        <nav aria-label="Settings sections" className="flex shrink-0 gap-1 overflow-x-auto lg:w-52 lg:flex-col">
          {SECTIONS.map(([k, label]) => (
            <button key={k} onClick={() => setParams({ tab: k }, { replace: true })}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-left text-sm ${
                key === k ? "bg-white font-semibold text-slate-900 ring-1 ring-slate-200" : "text-slate-600 hover:bg-slate-200/60"
              }`}>
              {label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-6">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mb-6 mt-1 text-sm text-slate-500">{description}</p>
          <Active />
        </div>
      </div>
    </div>
  );
}