import { useEffect, useState } from "react";
import { CreditCard, Pencil, Trash2 } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { CARD_ISSUERS } from "../utils/banks";

const NETWORKS = ["Visa", "Mastercard", "JCB", "American Express", "Other"];
const emptyForm = { nickname: "", issuer: "", kind: "Credit", network: "Visa", last4: "", dueDay: "", creditLimit: "" };

const field =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

export default function CardsManager() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    const { data } = await api.get("/cards");
    setItems(data);
  };

  useEffect(() => {
    load().catch(() => setError("Could not load cards"));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "last4") return setForm({ ...form, last4: value.replace(/\D/g, "").slice(0, 4) });
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.last4 && form.last4.length !== 4) return setError("Enter exactly the last 4 digits");
    try {
      if (editingId) await api.put(`/cards/${editingId}`, form);
      else await api.post("/cards", form);
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  const startEdit = (c) => {
    setEditingId(c._id);
    setForm({
      nickname: c.nickname, issuer: c.issuer || "", kind: c.kind, network: c.network,
      last4: c.last4 || "", dueDay: c.dueDay || "", creditLimit: c.creditLimit || "",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this card?")) return;
    await api.delete(`/cards/${id}`);
    load();
  };

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <form onSubmit={handleSubmit} className="h-fit space-y-3 rounded-2xl bg-white p-5 shadow-sm xl:col-span-1">
        <h3 className="text-lg font-semibold">{editingId ? "Edit card" : "Add card"}</h3>
        {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

        <input name="nickname" placeholder="Nickname (e.g. BDO Platinum)" value={form.nickname}
          onChange={handleChange} required className={field} />

        <select name="issuer" value={form.issuer} onChange={handleChange} className={field}>
          <option value="">Issuing bank</option>
          {CARD_ISSUERS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>

        <div className="grid grid-cols-2 gap-2">
          <select name="kind" value={form.kind} onChange={handleChange} className={field}>
            <option>Credit</option>
            <option>Debit</option>
          </select>
          <select name="network" value={form.network} onChange={handleChange} className={field}>
            {NETWORKS.map((n) => <option key={n}>{n}</option>)}
          </select>
        </div>

        <input name="last4" inputMode="numeric" maxLength={4} placeholder="Last 4 digits only"
          value={form.last4} onChange={handleChange} className={field} />
        <p className="-mt-1 text-xs text-slate-500">For safety, never enter the full card number.</p>

        {form.kind === "Credit" && (
          <div className="grid grid-cols-2 gap-2">
            <input name="dueDay" type="number" min="1" max="31" placeholder="Due day (1-31)"
              value={form.dueDay} onChange={handleChange} className={field} />
            <input name="creditLimit" type="number" min="0" step="0.01" placeholder="Credit limit"
              value={form.creditLimit} onChange={handleChange} className={field} />
          </div>
        )}

        <div className="flex gap-2">
          <button type="submit" className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700">
            {editingId ? "Save changes" : "Add card"}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="rounded-xl bg-slate-100 px-4 hover:bg-slate-200">Cancel</button>
          )}
        </div>
      </form>

      <div className="grid h-fit gap-4 sm:grid-cols-2 xl:col-span-2">
        {items.length === 0 && (
          <div className="rounded-2xl bg-white p-5 text-slate-500 shadow-sm sm:col-span-2">No cards yet. Add your first one.</div>
        )}
        {items.map((c) => (
          <div key={c._id}
            className={`rounded-2xl p-5 text-white shadow-sm ${c.kind === "Credit" ? "bg-linear-to-br from-indigo-600 to-slate-800" : "bg-linear-to-br from-emerald-600 to-slate-800"}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-lg font-semibold">{c.nickname}</div>
                <div className="text-sm text-white/70">{c.issuer || "—"}</div>
              </div>
              <CreditCard size={24} className="text-white/70" />
            </div>
            <div className="mt-6 text-xl tracking-widest">•••• •••• •••• {c.last4 || "••••"}</div>
            <div className="mt-4 flex items-end justify-between text-sm">
              <div className="text-white/80">
                <div>{c.kind} · {c.network}</div>
                {c.kind === "Credit" && c.dueDay && <div>Due on day {c.dueDay} of the month</div>}
                {c.kind === "Credit" && c.creditLimit && <div>Limit {formatMoney(c.creditLimit)}</div>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => startEdit(c)} className="rounded-lg bg-white/15 p-2 hover:bg-white/25" aria-label="Edit card"><Pencil size={14} /></button>
                <button onClick={() => remove(c._id)} className="rounded-lg bg-white/15 p-2 hover:bg-white/25" aria-label="Delete card"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}