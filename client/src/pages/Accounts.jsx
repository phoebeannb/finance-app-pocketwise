import { useEffect, useState } from "react";
import { Plus, Eye, Pencil, Landmark, CreditCard, HandCoins, TrendingUp, Building2, Wallet } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { toast } from "../utils/toast";
import Modal from "../components/Modal";
import ConfirmModal from "../components/ConfirmModal";
import BankPicker from "../components/BankPicker";
import AccountDetails from "../components/AccountDetails";
import BrandLogo from "../components/BrandLogo";
import { IconButton, Stat, Empty, ErrorBar, card } from "../components/ui";

const TYPES = ["Bank Account", "Credit Card", "Loan", "Investment", "Asset", "Other"];
const LIABILITIES = ["Credit Card", "Loan"];
const emptyForm = { name: "", type: "Bank Account", provider: "", balance: "", notes: "", color: "indigo" };
const COLORS = [
  ["indigo", "Indigo", "bg-indigo-100 text-indigo-800"],
  ["blue", "Blue", "bg-blue-100 text-blue-800"],
  ["green", "Green", "bg-green-100 text-green-800"],
  ["amber", "Amber", "bg-amber-100 text-amber-800"],
  ["rose", "Rose", "bg-rose-100 text-rose-800"],
  ["slate", "Slate", "bg-slate-200 text-slate-800"],
];

const VISUAL = {
  "Bank Account": [Landmark, "bg-indigo-100 text-indigo-800"],
  "Credit Card": [CreditCard, "bg-rose-100 text-rose-800"],
  "Loan": [HandCoins, "bg-amber-100 text-amber-800"],
  "Investment": [TrendingUp, "bg-emerald-100 text-emerald-800"],
  "Asset": [Building2, "bg-sky-100 text-sky-800"],
  "Other": [Wallet, "bg-slate-200 text-slate-800"],
};
const GROUP_TITLE = {
  "Bank Account": "Bank Account/Wallet", "Credit Card": "Credit cards", "Loan": "Loans",
  "Investment": "Investments", "Asset": "Assets", "Other": "Other",
};

const field =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function Accounts() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const [viewing, setViewing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = () =>
    api.get("/accounts")
      .then(({ data }) => { setItems(data); setError(""); })
      .catch((err) => setError(err.response ? "Could not load accounts." : "Can't reach the server. Make sure it's running, then try again."));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditing(null); setForm(emptyForm); setFormError(""); setFormOpen(true); };
  const openEdit = (a) => {
    setViewing(null);
    setEditing(a);
    setForm({ name: a.name, type: a.type, provider: a.provider || "", balance: a.balance, notes: a.notes || "", color: a.color || "indigo" });
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
    if (saving) return;
    setFormError("");
    const payload = { ...form, name: form.name.trim() || form.provider, balance: Number(form.balance) || 0 };
    if (!payload.name) return setFormError("Give the account a name or pick a bank");
    setSaving(true);
    try {
      if (editing) await api.put(`/accounts/${editing._id}`, payload);
      else await api.post("/accounts", payload);
      setFormOpen(false);
      toast.success(editing ? "Account updated." : "Account created.");
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const list = items || [];
  const visibleList = filter === "all" ? list : list.filter((a) => a.type === filter);
  const assets = list.filter((a) => !LIABILITIES.includes(a.type)).reduce((s, a) => s + a.currentBalance, 0);
  const liabilities = list.filter((a) => LIABILITIES.includes(a.type)).reduce((s, a) => s + a.currentBalance, 0);
  const netWorth = assets - liabilities;
  const isLiability = LIABILITIES.includes(form.type);

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Accounts</h2>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          <Plus size={16} aria-hidden="true" /> Create Account
        </button>
      </div>

      {error && <ErrorBar message={error} onRetry={load} />}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total Assets" value={formatMoney(assets)} color="text-green-700" />
        <Stat label="Total Liabilities" value={formatMoney(liabilities)} color="text-red-700" />
        <Stat label="Net Worth" value={formatMoney(netWorth)} color={netWorth < 0 ? "text-red-700" : "text-slate-900"} />
      </div>

      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Filter accounts">
        {[["all", "All"], ...TYPES.map((type) => [type, type])].map(([value, label]) => (
          <button key={value} type="button" onClick={() => setFilter(value)}
            className={`rounded-full border px-3 py-1.5 text-sm ${filter === value ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}>
            {label}
          </button>
        ))}
      </div>

      {!items && !error && <p className="text-slate-600">Loading...</p>}

      {items && items.length === 0 && (
        <Empty icon={Landmark} title="No accounts yet"
          action={<button onClick={openCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Create your first account</button>}>
          Add your bank account, e-wallet or cash so PocketWise can show what you have.
        </Empty>
      )}

      {TYPES.map((type) => {
        const group = visibleList.filter((a) => a.type === type);
        if (group.length === 0) return null;
        const [Icon, tone] = VISUAL[type];
        const owed = LIABILITIES.includes(type);
        const total = group.reduce((s, a) => s + a.currentBalance, 0);
        return (
          <section key={type} className="mb-8" aria-labelledby={`g-${type}`}>
            <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
              <h3 id={`g-${type}`} className="text-base font-semibold text-slate-900">{GROUP_TITLE[type]}</h3>
              <span className="text-sm text-slate-600">{owed ? "Owed" : "Total"} <b className="text-slate-900">{formatMoney(total)}</b></span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {group.map((a) => (
                <article key={a._id} className={`${card} flex flex-col p-4`}>
                  <div className="flex items-start gap-3">
                    {a.provider
                      ? <BrandLogo name={a.provider} label={a.name} />
                      : <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${COLORS.find(([key]) => key === a.color)?.[2] || tone}`}><Icon size={20} /></span>}
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate font-semibold text-slate-900">{a.name}</h4>
                      <p className="truncate text-sm text-slate-600">{a.provider || a.type}{a.notes ? ` · ${a.notes}` : ""}</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-600">{owed ? "Currently owed" : "Balance"}</div>
                    <div className={`text-2xl font-semibold ${owed ? "text-red-700" : a.currentBalance < 0 ? "text-red-700" : "text-slate-900"}`}>
                      {formatMoney(a.currentBalance)}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                    <button onClick={() => setViewing(a)} className="flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:underline">
                      <Eye size={16} aria-hidden="true" /> View details
                    </button>
                    <div className="flex">
                      <IconButton icon={Pencil} label="Edit" onClick={() => openEdit(a)} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editing ? "Edit account" : "Create account"}>
        <form onSubmit={handleSubmit} className="space-y-3">
          {formError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</p>}

          <label htmlFor="acc-type" className="block text-sm font-medium text-slate-700">Account type</label>
          <select id="acc-type" name="type" value={form.type} onChange={handleChange} className={field}>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          {form.type === "Bank Account" && (
            <>
              <span className="block text-sm font-medium text-slate-700">Bank / E-wallet</span>
              <BankPicker value={form.provider} onChange={(provider) => setForm({ ...form, provider })} />
            </>
          )}

          <label htmlFor="acc-name" className="sr-only">Account name</label>
          <input id="acc-name" name="name" aria-label="Account name" placeholder={form.provider ? `Nickname (default: ${form.provider})` : "Account name"}
            value={form.name} onChange={handleChange} className={field} />
          <label htmlFor="acc-balance" className="sr-only">{isLiability ? "Starting amount owed" : "Starting balance"}</label>
          <input id="acc-balance" name="balance" type="number" step="0.01" min="0" aria-label={isLiability ? "Starting amount owed" : "Starting balance"}
            placeholder={isLiability ? "Starting amount owed" : "Starting balance / value"}
            value={form.balance} onChange={handleChange} className={field} />
          <label htmlFor="acc-notes" className="sr-only">Notes (optional)</label>
          <input id="acc-notes" name="notes" aria-label="Notes" placeholder="Notes (optional)" value={form.notes} onChange={handleChange} className={field} />
          <fieldset>
            <legend className="mb-1 text-sm font-medium text-slate-700">Account color</legend>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(([key, label, tone]) => (
                <button key={key} type="button" aria-label={label} aria-pressed={form.color === key}
                  onClick={() => setForm({ ...form, color: key })}
                  className={`h-8 w-8 rounded-full ${tone.split(" ")[0]} ring-offset-2 ${form.color === key ? "ring-2 ring-indigo-600" : ""}`} />
              ))}
            </div>
          </fieldset>

          <button type="submit" disabled={saving} className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
            {saving ? "Saving..." : editing ? "Save changes" : "Create account"}
          </button>
          {editing && (
            <button type="button" onClick={() => { setFormOpen(false); setToDelete(editing); }}
              className="w-full rounded-lg border border-red-200 py-2.5 font-medium text-red-700 hover:bg-red-50">
              Delete account
            </button>
          )}
        </form>
      </Modal>

      <AccountDetails account={viewing} onClose={() => setViewing(null)} onEdit={openEdit} />

      <ConfirmModal
        open={!!toDelete}
        message={`Are you sure you want to delete "${toDelete?.name}"? You can only delete an account that has no transactions.`}
        onClose={() => setToDelete(null)}
        onConfirm={async () => { await api.delete(`/accounts/${toDelete._id}`); toast.success("Account deleted."); load(); }}
      />
    </div>
  );
}