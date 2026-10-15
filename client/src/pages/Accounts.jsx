import { useEffect, useState } from "react";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import BankPicker from "../components/BankPicker";
import AccountDetails from "../components/AccountDetails";

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
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const [viewing, setViewing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const load = async () => {
    const { data } = await api.get("/accounts");
    setItems(data);
  };

  useEffect(() => {
    load().catch(() => setError("Could not load accounts"));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (a) => {
    setViewing(null);
    setEditing(a);
    setForm({ name: a.name, type: a.type, provider: a.provider || "", balance: a.balance, notes: a.notes || "" });
    setFormError("");
    setFormOpen(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "type") setForm({ ...form, type: value, provider: value === "Bank Account" ? form.provider : "" });
    else setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    const payload = { ...form, name: form.name.trim() || form.provider, balance: Number(form.balance) || 0 };
    if (!payload.name) return setFormError("Give the account a name or pick a bank");
    try {
      if (editing) await api.put(`/accounts/${editing._id}`, payload);
      else await api.post("/accounts", payload);
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Something went wrong");
    }
  };

  const assets = items.filter((a) => !LIABILITIES.includes(a.type)).reduce((s, a) => s + a.currentBalance, 0);
  const liabilities = items.filter((a) => LIABILITIES.includes(a.type)).reduce((s, a) => s + a.currentBalance, 0);
  const netWorth = assets - liabilities;
  const isLiability = LIABILITIES.includes(form.type);

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Accounts</h2>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white shadow-lg shadow-indigo-200 hover:bg-indigo-700">
          <Plus size={18} /> Create Account
        </button>
      </div>

      {error && <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card label="Total Assets" value={formatMoney(assets)} color="text-green-600" />
        <Card label="Total Liabilities" value={formatMoney(liabilities)} color="text-red-600" />
        <Card label="Net Worth" value={formatMoney(netWorth)} color={netWorth < 0 ? "text-red-600" : "text-indigo-600"} />
      </div>

      <div className="space-y-4">
        {items.length === 0 && (
          <div className="rounded-2xl bg-white p-5 text-slate-500 shadow-sm">No accounts yet. Click “Create Account” to add your first one.</div>
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
                      <div className="truncate text-sm text-slate-500">{[a.provider, a.notes].filter(Boolean).join(" · ")}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`mr-1 font-semibold ${LIABILITIES.includes(a.type) ? "text-red-600" : "text-slate-800"}`}>
                        {formatMoney(a.currentBalance)}
                      </span>
                      <button onClick={() => setViewing(a)} className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1 text-sm text-indigo-700 hover:bg-indigo-100">
                        <Eye size={14} /> View
                      </button>
                      <button onClick={() => openEdit(a)} className="flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-sm hover:bg-slate-200">
                        <Pencil size={14} /> Edit
                      </button>
                      <button onClick={() => setToDelete(a)} className="flex items-center gap-1 rounded-lg bg-red-50 px-3 py-1 text-sm text-red-600 hover:bg-red-100">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Create / edit popup */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit account" : "Create account"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {formError && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{formError}</p>}

          <label className="block text-sm font-medium text-slate-700">Account Type</label>
          <select name="type" value={form.type} onChange={handleChange} className={field}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          {form.type === "Bank Account" && (
            <>
              <label className="block text-sm font-medium text-slate-700">Bank / E-wallet</label>
              <BankPicker value={form.provider} onChange={(provider) => setForm({ ...form, provider })} />
            </>
          )}

          <input name="name" placeholder={form.provider ? `Nickname (default: ${form.provider})` : "Account name"}
            value={form.name} onChange={handleChange} className={field} />
          <input name="balance" type="number" step="0.01" min="0"
            placeholder={isLiability ? "Starting amount owed" : "Starting balance / value"}
            value={form.balance} onChange={handleChange} className={field} />
          <input name="notes" placeholder="Notes (optional)" value={form.notes} onChange={handleChange} className={field} />

          <button type="submit" className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700">
            {editing ? "Save changes" : "Create account"}
          </button>
          {editing && (
            <button type="button" onClick={() => { setFormOpen(false); setToDelete(editing); }}
              className="w-full rounded-xl bg-red-50 py-2.5 font-medium text-red-600 hover:bg-red-100">
              Delete account
            </button>
          )}
        </form>
      </Modal>

      <AccountDetails account={viewing} onClose={() => setViewing(null)} onEdit={openEdit} />

      <ConfirmModal
        open={!!toDelete}
        message={`Delete "${toDelete?.name}"? Past transactions stay, but they won't be linked to this account anymore.`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { await api.delete(`/accounts/${toDelete._id}`); load(); }}
      />
    </div>
  );
}