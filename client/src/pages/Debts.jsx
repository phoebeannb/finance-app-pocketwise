import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowDownLeft, ArrowUpRight, Check, Plus, Trash2, Users, History } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { toast } from "../utils/toast";
import { undoableDelete } from "../utils/undoDelete";
import Modal from "../components/Modal";
import { ErrorBar, Empty, card } from "../components/ui";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const today = () => new Date().toISOString().slice(0, 10);
const blank = () => ({ kind: "debt", direction: "owed_to_me", person: "", description: "", total: "", amountOwed: "", myShare: "", dueDate: "", notes: "", group: "" });
const dateLabel = (value) => value ? new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "No due date";

export default function Debts() {
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blank());
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [paymentFor, setPaymentFor] = useState(null);
  const [payment, setPayment] = useState({ amount: "", note: "" });
  const [groups, setGroups] = useState([]);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupMode, setGroupMode] = useState("create");
  const [groupForm, setGroupForm] = useState({ name: "", code: "" });
  const navigate = useNavigate();

  const load = () => api.get("/debts").then(({ data }) => { setItems(data); setError(""); })
    .catch((err) => setError(err.response ? "Could not load your utang records." : "Can't reach the server. Make sure it's running, then try again."));
  const loadGroups = () => api.get("/shared-groups").then(({ data }) => setGroups(data)).catch(() => {});
  useEffect(() => { load(); loadGroups(); }, []);

  const openAdd = (kind = "debt") => {
    setForm({ ...blank(), kind, direction: kind === "shared" ? "owed_to_me" : "owed_to_me" });
    setFormError("");
    setOpen(true);
  };
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const selectedGroup = groups.find((group) => group._id === form.group);
  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setFormError("");
    const total = Number(form.total);
    const myShare = Number(form.myShare);
    const amountOwed = form.kind === "shared"
      ? (form.direction === "owed_to_me" ? total - myShare : myShare)
      : Number(form.amountOwed || form.total);
    if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(amountOwed) || amountOwed <= 0 || amountOwed > total) {
      setFormError(form.kind === "shared"
        ? "Enter a valid share. The amount owed must be greater than zero."
        : "Enter a valid amount.");
      return;
    }
    const payload = { ...form, total, amountOwed, date: `${today()}T00:00:00.000Z` };
    setSaving(true);
    try {
      await api.post("/debts", { ...payload, group: form.group || null });
      setOpen(false);
      toast.success(form.kind === "shared" ? "Shared bill added." : "Utang record added.");
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not save this record.");
    } finally {
      setSaving(false);
    }
  };
  const saveGroup = async (e) => {
    e.preventDefault();
    try {
      const { data } = groupMode === "create"
        ? await api.post("/shared-groups", { name: groupForm.name })
        : await api.post("/shared-groups/join", { code: groupForm.code });
      setGroups((current) => [data, ...current.filter((group) => group._id !== data._id)]);
      setGroupOpen(false);
      setGroupForm({ name: "", code: "" });
      toast.success(groupMode === "create" ? `Group created. Share code ${data.code}.` : `Joined ${data.name}.`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save this group.");
    }
  };
  const settle = async (item) => {
    try {
      await api.post(`/debts/${item._id}/settle`);
      toast.success(`${item.person}'s record marked as settled.`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not settle this record.");
    }
  };
  const recordPayment = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/debts/${paymentFor._id}/payment`, payment);
      toast.success("Payment recorded.");
      setPaymentFor(null);
      setPayment({ amount: "", note: "" });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not record this payment.");
    }
  };
  const remove = (item) => {
    undoableDelete({
      key: `debt-${item._id}`,
      message: `"${item.description}" deleted. You can restore it for 5 seconds.`,
      hide: () => setItems((list) => list.filter((entry) => entry._id !== item._id)),
      restore: () => setItems((list) => [...list, item].sort((a, b) => {
        if (a.status !== b.status) return a.status === "open" ? -1 : 1;
        return new Date(a.dueDate || "9999-12-31") - new Date(b.dueDate || "9999-12-31");
      })),
      run: () => api.delete(`/debts/${item._id}`),
    });
  };
  const openItems = useMemo(() => (items || []).filter((item) => item.status === "open"), [items]);
  const owedToMe = openItems.filter((item) => item.direction === "owed_to_me").reduce((sum, item) => sum + item.amountOwed, 0);
  const iOwe = openItems.filter((item) => item.direction === "i_owe").reduce((sum, item) => sum + item.amountOwed, 0);

  return (
    <div className="w-full">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Utang & Shared Expenses</h2>
          <p className="mt-1 text-sm text-slate-600">Track who owes you and who you need to pay.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setGroupMode("create"); setGroupOpen(true); }} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"><Users size={16} /> Create/join group</button>
          <button type="button" onClick={() => openAdd("shared")} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"><Users size={16} /> Split a bill</button>
          <button type="button" onClick={() => openAdd()} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"><Plus size={16} /> Add utang</button>
        </div>
      </div>
      {error && <ErrorBar message={error} onRetry={load} />}
      {items && (
        <>
          {groups.length > 0 && <div className="mb-6 grid gap-3 sm:grid-cols-2">
            {groups.map((group) => (
              <div key={group._id} className={`${card} border-indigo-100 bg-indigo-50/50 p-4`}>
                <div className="flex items-center justify-between gap-3">
                  <div><button type="button" onClick={() => navigate(`/debts/groups/${group._id}`)} className="text-left font-semibold hover:text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-300">{group.name}</button><div className="text-sm text-slate-600">{group.members.length} member{group.members.length === 1 ? "" : "s"}</div></div>
                  <button type="button" onClick={() => { navigator.clipboard?.writeText(group.code); toast.success("Invite code copied."); }} className="rounded-md border border-indigo-200 bg-white px-2.5 py-1.5 text-xs font-semibold tracking-widest text-indigo-800 hover:bg-indigo-50">{group.code}</button>
                </div>
                <p className="mt-2 text-xs text-slate-600">Share this code to invite friends and manage shared bills together.</p>
              </div>
            ))}
          </div>}
          <div className="mb-6 grid gap-4 sm:grid-cols-2">
            <div className={`${card} p-4`}><div className="text-sm text-slate-600">People owe me</div><div className="mt-1 text-2xl font-semibold text-green-700">{formatMoney(owedToMe)}</div><div className="text-xs text-slate-600">{openItems.filter((i) => i.direction === "owed_to_me").length} open records</div></div>
            <div className={`${card} p-4`}><div className="text-sm text-slate-600">I owe others</div><div className="mt-1 text-2xl font-semibold text-red-700">{formatMoney(iOwe)}</div><div className="text-xs text-slate-600">{openItems.filter((i) => i.direction === "i_owe").length} open records</div></div>
          </div>
          {!items.length && <Empty icon={Users} title="No utang records yet" action={<button onClick={() => openAdd("shared")} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Split your first bill</button>}>Track dinner, rent, group gifts, or money you lent to a friend.</Empty>}
          <div className="space-y-3">
            {items.map((item) => (
              <article key={item._id} className={`${card} flex flex-wrap items-center gap-4 p-4`}>
                <span className={`flex h-10 w-10 items-center justify-center rounded-full ${item.direction === "owed_to_me" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {item.direction === "owed_to_me" ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{item.person} <span className="font-normal text-slate-500">· {item.description}</span></div>
                  <div className="text-sm text-slate-600">{item.kind === "shared" ? `Shared bill · Total ${formatMoney(item.total)}` : "Personal utang"}{item.group?.name ? ` · Group: ${item.group.name}` : ""} · {dateLabel(item.dueDate)}</div>
                </div>
                <div className={`text-lg font-semibold ${item.status === "settled" ? "text-slate-500 line-through" : item.direction === "owed_to_me" ? "text-green-700" : "text-red-700"}`}>{formatMoney(item.amountOwed)}</div>
                {item.status === "open" && <button type="button" onClick={() => { setPaymentFor(item); setPayment({ amount: "", note: "" }); }} className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"><History size={15} /> Record payment</button>}
                {item.status === "open" && <button type="button" onClick={() => settle(item)} className="flex items-center gap-1 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"><Check size={15} /> Settle all</button>}
                <button type="button" onClick={() => remove(item)} aria-label={`Delete ${item.description}`} className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button>
                {!!item.payments?.length && <div className="w-full border-t border-slate-100 pt-2 text-xs text-slate-600">Payments: {item.payments.map((p) => `${formatMoney(p.amount)}${p.note ? ` (${p.note})` : ""}`).join(" · ")}</div>}
              </article>
            ))}
          </div>
        </>
      )}
      <Modal open={open} onClose={() => setOpen(false)} title={form.kind === "shared" ? "Split a bill" : "Add utang"}>
        <form onSubmit={submit} className="space-y-3">
          {formError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
          {form.kind === "shared" && <div className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">Enter the full bill and your share. The amount owed is calculated based on who owes whom.</div>}
          <label className="block text-sm font-medium">Person
            {selectedGroup
              ? <select name="person" value={form.person} onChange={handleChange} className={field} required><option value="">Choose a group member</option>{selectedGroup.members.map((member) => <option key={member._id} value={member.name || member.email}>{member.name || member.email}</option>)}</select>
              : <input name="person" value={form.person} onChange={handleChange} placeholder="e.g. Maria" className={field} required />}
          </label>
          <label className="block text-sm font-medium">Description<input name="description" value={form.description} onChange={handleChange} placeholder="e.g. Dinner at Manam" className={field} required /></label>
          <label className="block text-sm font-medium">Who owes whom<select name="direction" value={form.direction} onChange={handleChange} className={field}><option value="owed_to_me">They owe me</option><option value="i_owe">I owe them</option></select></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">{form.kind === "shared" ? "Full bill total" : "Amount"}<input name="total" type="number" min="0.01" step="0.01" value={form.total} onChange={handleChange} className={field} required /></label>
            {form.kind === "shared" && <label className="block text-sm font-medium">My share<input name="myShare" type="number" min="0" step="0.01" value={form.myShare} onChange={handleChange} placeholder="What you paid" className={field} required /></label>}
          </div>
          {form.kind === "shared" && <label className="block text-sm font-medium">Shared group (optional)<select name="group" value={form.group || ""} onChange={handleChange} className={field}><option value="">Only me</option>{groups.map((group) => <option key={group._id} value={group._id}>{group.name} · {group.members.length} members</option>)}</select>{selectedGroup && <span className="mt-1 block text-xs font-normal text-slate-600">Choose the member involved above. This record will be visible to everyone in {selectedGroup.name}.</span>}</label>}
          <label className="block text-sm font-medium">Due date (optional)<input name="dueDate" type="date" value={form.dueDate} onChange={handleChange} className={field} /></label>
          <button type="submit" disabled={saving} className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white disabled:opacity-60">{saving ? "Saving..." : "Save record"}</button>
        </form>
      </Modal>
      <Modal open={groupOpen} onClose={() => setGroupOpen(false)} title={groupMode === "create" ? "Create a shared group" : "Join a shared group"}>
        <div className="mb-4 flex rounded-lg bg-slate-100 p-1">
          <button type="button" onClick={() => setGroupMode("create")} className={`flex-1 rounded-md py-2 text-sm font-medium ${groupMode === "create" ? "bg-white shadow-sm" : "text-slate-600"}`}>Create group</button>
          <button type="button" onClick={() => setGroupMode("join")} className={`flex-1 rounded-md py-2 text-sm font-medium ${groupMode === "join" ? "bg-white shadow-sm" : "text-slate-600"}`}>Join with code</button>
        </div>
        <form onSubmit={saveGroup} className="space-y-3">
          {groupMode === "create"
            ? <label className="block text-sm font-medium">Group name<input value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} placeholder="e.g. Boracay trip" className={field} required /></label>
            : <label className="block text-sm font-medium">Invite code<input value={groupForm.code} onChange={(e) => setGroupForm({ ...groupForm, code: e.target.value.toUpperCase() })} placeholder="8-character code" maxLength={8} className={field} required /></label>}
          <p className="text-sm text-slate-600">{groupMode === "create" ? "Share the code after creating the group. Friends can use it to join." : "Ask the group owner for the 8-character invite code."}</p>
          <button type="submit" className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700">{groupMode === "create" ? "Create group" : "Join group"}</button>
        </form>
      </Modal>
      <Modal open={!!paymentFor} onClose={() => setPaymentFor(null)} title="Record payment">
        <form onSubmit={recordPayment} className="space-y-3">
          <p className="text-sm text-slate-600">{paymentFor?.person} · Remaining {formatMoney(paymentFor?.amountOwed || 0)}</p>
          <label className="block text-sm font-medium">Payment amount<input type="number" min="0.01" step="0.01" max={paymentFor?.amountOwed} value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} className={field} required /></label>
          <label className="block text-sm font-medium">Note (optional)<input value={payment.note} onChange={(e) => setPayment({ ...payment, note: e.target.value })} placeholder="e.g. GCash payment" className={field} /></label>
          <button type="submit" className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white hover:bg-indigo-700">Save payment</button>
        </form>
      </Modal>
    </div>
  );
}
