import { useEffect, useState } from "react";
import { Plus, Eye, Pencil, Trash2 } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import BankPicker from "../components/BankPicker";
import AccountDetails from "../components/AccountDetails";
import { IconButton, Stat, TableCard, ErrorBar } from "../components/ui";

const TYPES = ["Bank Account", "Credit Card", "Loan", "Investment", "Asset", "Other"];
const LIABILITIES = ["Credit Card", "Loan"];
const emptyForm = { name: "", type: "Bank Account", provider: "", balance: "", notes: "" };

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function Accounts() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");

  const [viewing, setViewing] = useState(null);
  const [toDelete, setToDelete] = useState(null);

  const load = () =>
    api.get("/accounts")
      .then(({ data }) => { setItems(data); setError(""); })
      .catch((err) => setError(err.response ? "Could not load accounts." : "Can't reach the server. Make sure it's running, then try again."));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormError(""); setFormOpen(true); };
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

  const list = items || [];
  const sorted = [...list].sort((a, b) => TYPES.indexOf(a.type) - TYPES.indexOf(b.type) || a.name.localeCompare(b.name));
  const assets = list.filter((a) => !LIABILITIES.includes(a.type)).reduce((s, a) => s + a.currentBalance, 0);
  const liabilities = list.filter((a) => LIABILITIES.includes(a.type)).reduce((s, a) => s + a.currentBalance, 0);
  const netWorth = assets - liabilities;
  const isLiability = LIABILITIES.includes(form.type);

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Accounts</h2>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus size={16} /> Create Account
        </button>
      </div>

      {error && <ErrorBar message={error} onRetry={load} />}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total Assets" value={formatMoney(assets)} color="text-green-600" />
        <Stat label="Total Liabilities" value={formatMoney(liabilities)} color="text-red-600" />
        <Stat label="Net Worth" value={formatMoney(netWorth)} color={netWorth < 0 ? "text-red-600" : "text-slate-900"} />
      </div>

      <TableCard>
        <table className="data-table">
          <thead>
            <tr><th>Account</th><th>Type</th><th>Bank / E-wallet</th><th className="num">Balance</th><th className="actions" /></tr>
          </thead>
          <tbody>
            {sorted.map((a) => (
              <tr key={a._id}>
                <td>
                  <div className="font-medium">{a.name}</div>
                  {a.notes && <div className="max-w-60 truncate text-xs text-slate-500">{a.notes}</div>}
                </td>
                <td className="text-slate-600">{a.type}</td>
                <td className="text-slate-600">{a.provider || "—"}</td>
                <td className={`num font-semibold ${LIABILITIES.includes(a.type) ? "text-red-600" : ""}`}>{formatMoney(a.currentBalance)}</td>
                <td className="actions">
                  <IconButton icon={Eye} label="View details" onClick={() => setViewing(a)} />
                  <IconButton icon={Pencil} label="Edit" onClick={() => openEdit(a)} />
                  <IconButton icon={Trash2} label="Delete" danger onClick={() => setToDelete(a)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items && items.length === 0 && <p className="p-6 text-center text-slate-500">No accounts yet. Click “Create Account” to add your first one.</p>}
        {!items && !error && <p className="p-6 text-center text-slate-500">Loading...</p>}
      </TableCard>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit account" : "Create account"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {formError && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{formError}</p>}

          <label className="block text-sm font-medium text-slate-700">Account type</label>
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

          <button type="submit" className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700">
            {editing ? "Save changes" : "Create account"}
          </button>
          {editing && (
            <button type="button" onClick={() => { setFormOpen(false); setToDelete(editing); }}
              className="w-full rounded-lg border border-red-200 py-2.5 font-medium text-red-600 hover:bg-red-50">
              Delete account
            </button>
          )}
        </form>
      </Modal>

      <AccountDetails account={viewing} onClose={() => setViewing(null)} onEdit={openEdit} />

      <ConfirmModal
        open={!!toDelete}
        message={`Delete "${toDelete?.name}"?`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { await api.delete(`/accounts/${toDelete._id}`); load(); }}
      />
    </div>
  );
}