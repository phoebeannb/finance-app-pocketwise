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

  const dirty =
    form.currency !== prefs.currency ||
    form.dateFormat !== prefs.dateFormat ||
    (form.defaultAccount || null) !== (prefs.defaultAccount || null);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // After a currency or date change the screen redraws once so every number updates
      await save({ currency: form.currency, dateFormat: form.dateFormat, defaultAccount: form.defaultAccount || null });
    } catch { /* the red message explains what to fix */ } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <Block title="Display">
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

      <Actions>
        <button type="button" onClick={() => setForm(prefs)} disabled={!dirty || saving} className={secondaryBtn}>Discard</button>
        <button type="submit" disabled={!dirty || saving} className={primaryBtn}>{saving ? "Saving..." : "Save Changes"}</button>
      </Actions>
    </form>
  );
}