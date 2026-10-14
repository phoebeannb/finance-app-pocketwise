import { useEffect, useState } from "react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { PH_BANK_GROUPS } from "../utils/banks";

const TYPES = ["Bank Account", "Credit Card", "Loan", "Investment", "Asset", "Other"];
const LIABILITIES = ["Credit Card", "Loan"];
const emptyForm = { name: "", type: "Bank Account", provider: "", balance: "", notes: "" };

const field =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100";

function Card({ label, value, color = "text-slate-800" }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-1 truncate text-2xl font-semibold ${color}`}>{value}</div>
    </div>
  );
}

export default function Accounts() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    const { data } = await api.get("/accounts");
    setItems(data);
  };

  useEffect(() => {
    load().catch(() => setError("Could not load accounts"));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "type") setForm({ ...form, type: value, provider: value === "Bank Account" ? form.provider : "" });
    else setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const payload = { ...form, name: form.name.trim() || form.provider, balance: Number(form.balance) || 0 };
    if (!payload.name) return setError("Give the account a name or pick a bank");
    try {
      if (editingId) await api.put(`/accounts/${editingId}`, payload);
      else await api.post("/accounts", payload);
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  const startEdit = (a) => {
    setEditingId(a._id);
    setForm({ name: a.name, type: a.type, provider: a.provider || "", balance: a.balance, notes: a.notes || "" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this account?")) return;
    await api.delete(`/accounts/${id}`);
    load();
  };

  const assets = items.filter((a) => !LIABILITIES.includes(a.type)).reduce((s, a) => s + a.currentBalance, 0);
  const liabilities = items.filter((a) => LIABILITIES.includes(a.type)).reduce((s, a) => s + a.currentBalance, 0);
  const netWorth = assets - liabilities;
  const isLiability = LIABILITIES.includes(form.type);

  return (
    <div className="w-full">
      <h2 className="mb-6 text-2xl font-bold">Accounts</h2>
      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card label="Total Assets" value={formatMoney(assets)} color="text-green-600" />
        <Card label="Total Liabilities" value={formatMoney(liabilities)} color="text-red-600" />
        <Card label="Net Worth" value={formatMoney(netWorth)} color={netWorth < 0 ? "text-red-600" : "text-indigo-600"} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <form onSubmit={handleSubmit} className="h-fit space-y-3 rounded-2xl bg-white p-5 shadow-sm xl:col-span-1">
          <h3 className="text-lg font-semibold">{editingId ? "Edit account" : "Create account"}</h3>

          <label className="block text-sm font-medium text-slate-700">Account Type</label>
          <select name="type" value={form.type} onChange={handleChange} className={field}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          {form.type === "Bank Account" && (
            <>
              <label className="block text-sm font-medium text-slate-700">Bank / E-wallet</label>
              <select name="provider" value={form.provider} onChange={handleChange} className={field}>
                <option value="">Select bank or e-wallet</option>
                {PH_BANK_GROUPS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </optgroup>
                ))}
              </select>
            </>
          )}

          <input name="name" placeholder={form.provider ? `Nickname (default: ${form.provider})` : "Account name"}
            value={form.name} onChange={handleChange} className={field} />
          <input name="balance" type="number" step="0.01" min="0"
            placeholder={isLiability ? "Starting amount owed" : "Starting balance / value"}
            value={form.balance} onChange={handleChange} className={field} />
          <input name="notes" placeholder="Notes (optional)" value={form.notes} onChange={handleChange} className={field} />

          <div className="flex gap-2">
            <button type="submit" className="flex-1 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700">
              {editingId ? "Save changes" : "Create"}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="rounded-xl bg-slate-100 px-4 hover:bg-slate-200">Cancel</button>
            )}
          </div>
        </form>

        <div className="space-y-4 xl:col-span-2">
          {items.length === 0 && (
            <div className="rounded-2xl bg-white p-5 text-slate-500 shadow-sm">No accounts yet. Create your first one.</div>
          )}
          {TYPES.map((type) => {
            const group = items.filter((a) => a.type === type);
            if (group.length === 0) return null;
            return (
              <div key={type} className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="mb-2 text-lg font-semibold">{type}</h3>
                <ul className="divide-y divide-slate-100">
                  {group.map((a) => (
                    <li key={a._id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="font-medium">{a.name}</div>
                        <div className="truncate text-sm text-slate-500">
                          {[a.provider, a.notes].filter(Boolean).join(" · ")}
                          {a.currentBalance !== a.balance && ` · started at ${formatMoney(a.balance)}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-semibold ${LIABILITIES.includes(a.type) ? "text-red-600" : "text-slate-800"}`}>
                          {formatMoney(a.currentBalance)}
                        </span>
                        <button onClick={() => startEdit(a)} className="rounded-lg bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200">Edit</button>
                        <button onClick={() => handleDelete(a._id)} className="rounded-lg bg-red-50 px-3 py-1 text-sm text-red-600 hover:bg-red-100">Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}