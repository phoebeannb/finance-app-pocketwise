import { useEffect, useState } from "react";
import api from "../api/axios";
import { usePrefs } from "../context/PreferencesContext";
import { CURRENCIES, formatMoneyIn } from "../utils/format";
import { DATE_FORMATS, formatDateWith } from "../utils/datetime";

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const FLASH = "pw_flash";

export default function PreferencesPanel() {
  const { prefs, save } = usePrefs();
  const [form, setForm] = useState(prefs);
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ ok: "", err: "" });

  useEffect(() => {
    api.get("/accounts").then(({ data }) => setAccounts(data)).catch(() => {});
    // After a currency or date-format change the screen reloads once, so the confirmation is passed along
    const flash = sessionStorage.getItem(FLASH);
    if (flash) {
      sessionStorage.removeItem(FLASH);
      setMsg({ ok: flash, err: "" });
    }
  }, []);

  const dirty =
    form.currency !== prefs.currency ||
    form.dateFormat !== prefs.dateFormat ||
    (form.defaultAccount || null) !== (prefs.defaultAccount || null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ ok: "", err: "" });
    sessionStorage.setItem(FLASH, "Preferences saved.");
    try {
      const reloaded = await save({
        currency: form.currency,
        dateFormat: form.dateFormat,
        defaultAccount: form.defaultAccount || null,
      });
      if (!reloaded) {
        sessionStorage.removeItem(FLASH);
        setMsg({ ok: "Preferences saved.", err: "" });
      }
    } catch (err) {
      sessionStorage.removeItem(FLASH);
      setMsg({ ok: "", err: err.response?.data?.message || "Couldn't save. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <div>
        <h3 className="text-lg font-semibold">Preferences</h3>
      </div>

      {msg.ok && <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{msg.ok}</p>}
      {msg.err && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{msg.err}</p>}

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Currency</label>
        <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={field}>
          {CURRENCIES.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Date format</label>
        <select value={form.dateFormat} onChange={(e) => setForm({ ...form, dateFormat: e.target.value })} className={field}>
          {DATE_FORMATS.map(([key, example]) => <option key={key} value={key}>{example}</option>)}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-700">Default account</label>
        <select value={form.defaultAccount || ""} onChange={(e) => setForm({ ...form, defaultAccount: e.target.value || null })} className={field}>
          <option value="">None</option>
          {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
        </select>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        Preview: <span className="font-semibold text-slate-900">{formatMoneyIn(form.currency, 12345.67)}</span>
        {" · "}
        <span className="font-semibold text-slate-900">{formatDateWith(form.dateFormat, new Date().toISOString())}</span>
      </div>

      <button type="submit" disabled={!dirty || saving}
        className="rounded-lg bg-indigo-600 px-5 py-2 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
        {saving ? "Saving..." : "Save preferences"}
      </button>
    </form>
  );
}