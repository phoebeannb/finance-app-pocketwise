import { useEffect, useState } from "react";
import api from "../api/axios";
import { usePrefs } from "../context/PreferencesContext";
import { CURRENCIES, formatMoneyIn } from "../utils/format";
import { DATE_FORMATS, formatDateWith } from "../utils/datetime";
import { Block, Row, Actions, inputClass, primaryBtn, secondaryBtn } from "./SettingsUI";

export default function PreferencesPanel() {
  const { prefs, save } = usePrefs();
  const [form, setForm] = useState(prefs);
  const [accounts, setAccounts] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/accounts").then(({ data }) => setAccounts(data)).catch(() => {});
  }, []);

  useEffect(() => {
    setForm(prefs);
  }, [prefs]);

  const updateDisplay = (patch) => {
    const next = { ...form, ...patch };
    setForm(next);
    if (patch.theme) document.documentElement.dataset.theme = patch.theme;
    if (patch.accent) document.documentElement.dataset.accent = patch.accent;
    if (patch.iconStyle) document.documentElement.dataset.iconStyle = patch.iconStyle;
  };

  const dirty =
    form.currency !== prefs.currency ||
    form.dateFormat !== prefs.dateFormat ||
    (form.defaultAccount || null) !== (prefs.defaultAccount || null) ||
    form.reportRange !== prefs.reportRange ||
    form.theme !== prefs.theme || form.accent !== prefs.accent || form.iconStyle !== prefs.iconStyle;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // After a currency or date change the screen redraws once so every number updates
      await save({
        currency: form.currency, dateFormat: form.dateFormat,
        defaultAccount: form.defaultAccount || null, reportRange: Number(form.reportRange),
        theme: form.theme, accent: form.accent, iconStyle: form.iconStyle,
      });
    } catch { /* the red message explains what to fix */ } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Block title="Display">
        <Row label="Theme" hint="Choose a comfortable look for day or night.">
          <select value={form.theme} onChange={(e) => updateDisplay({ theme: e.target.value })} className={inputClass}>
            <option value="light">Light</option><option value="dark">Dark</option>
          </select>
        </Row>
        <Row label="Accent color" hint="Personalize buttons and highlights.">
          <select value={form.accent} onChange={(e) => updateDisplay({ accent: e.target.value })} className={inputClass}>
            <option value="indigo">Indigo</option><option value="emerald">Emerald</option><option value="rose">Rose</option><option value="amber">Amber</option>
          </select>
        </Row>
        <Row label="Icon style" hint="Choose classic or colorful navigation icons.">
          <select value={form.iconStyle} onChange={(e) => updateDisplay({ iconStyle: e.target.value })} className={inputClass}>
            <option value="classic">Classic</option><option value="colorful">Colorful</option>
          </select>
        </Row>
        <Row label="Currency" hint="">
          <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={inputClass}>
            {CURRENCIES.map(([code, name]) => <option key={code} value={code}>{code} · {name}</option>)}
          </select>
        </Row>
        <Row label="Date Format">
          <select value={form.dateFormat} onChange={(e) => setForm({ ...form, dateFormat: e.target.value })} className={inputClass}>
            {DATE_FORMATS.map(([key, example]) => <option key={key} value={key}>{example}</option>)}
          </select>
        </Row>
        <Row label="Preview">
          <p className="py-2 text-sm text-slate-700">
            {formatMoneyIn(form.currency, 12345.67)} · {formatDateWith(form.dateFormat, new Date().toISOString())}
          </p>
        </Row>
      </Block>

      <div className="mt-8" />
      <Block title="Transactions">
        <Row label="Default Account">
          <select value={form.defaultAccount || ""} onChange={(e) => setForm({ ...form, defaultAccount: e.target.value || null })} className={inputClass}>
            <option value="">None</option>
            {accounts.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
        </Row>
      </Block>

      <div className="mt-8" />
      <Block title="Reports">
        <Row label="Monthly breakdown" hint="Choose how many months to show by default.">
          <select value={form.reportRange} onChange={(e) => setForm({ ...form, reportRange: Number(e.target.value) })} className={inputClass}>
            <option value={6}>6 months</option>
            <option value={12}>12 months</option>
          </select>
        </Row>
      </Block>

      <Actions>
        <button type="button" onClick={() => setForm(prefs)} disabled={!dirty || saving} className={secondaryBtn}>Discard</button>
        <button type="submit" disabled={!dirty || saving} className={primaryBtn}>{saving ? "Saving..." : "Save Changes"}</button>
      </Actions>
    </form>
  );
}