import { useSearchParams } from "react-router-dom";
import ProfileInfo from "../components/ProfileInfo";
import PreferencesPanel from "../components/PreferencesPanel";
import CategoriesManager from "../components/CategoriesManager";
import DataPrivacy from "../components/DataPrivacy";

const SECTIONS = [
  ["profile", "Profile", "", ProfileInfo],
  ["preferences", "Preferences", "", PreferencesPanel],
  ["categories", "Categories", "", CategoriesManager],
  ["data", "Data & Privacy", "Download your data or delete your account.", DataPrivacy],
];

export default function Settings() {
  const [params, setParams] = useSearchParams();
  const key = SECTIONS.some(([k]) => k === params.get("tab")) ? params.get("tab") : "profile";
  const [, title, description, Active] = SECTIONS.find(([k]) => k === key);
  const go = (k) => setParams({ tab: k }, { replace: true });

  return (
    <div className="w-full">
      <h2 className="mb-6 text-2xl font-semibold">Settings</h2>

      <div className="flex flex-col gap-6 sm:flex-row">
        {/* Phone: a dropdown */}
        <div className="sm:hidden">
          <label htmlFor="settings-section" className="mb-1 block text-sm font-medium text-slate-700">Section</label>
          <select id="settings-section" value={key} onChange={(e) => go(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100">
            {SECTIONS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>

        {/* Tablet and desktop: a list down the left */}
        <nav aria-label="Settings sections" className="hidden shrink-0 gap-1 sm:flex sm:w-44 sm:flex-col lg:w-52">
          {SECTIONS.map(([k, label]) => (
            <button key={k} onClick={() => go(k)} aria-current={key === k ? "page" : undefined}
              className={`whitespace-nowrap rounded-md px-3 py-2 text-left text-sm ${
                key === k ? "bg-white font-semibold text-slate-900 ring-1 ring-slate-200" : "text-slate-700 hover:bg-slate-200/60"
              }`}>
              {label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mb-6 mt-1 text-sm text-slate-500">{description}</p>
          <Active />
        </div>
      </div>
    </div>
  );
}