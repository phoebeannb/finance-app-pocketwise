import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, CheckCircle2, Copy, Plus, Receipt, Sparkles, Users, WalletCards } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../utils/format";
import { toast } from "../utils/toast";
import { ErrorBar, Empty, card } from "../components/ui";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const today = () => new Date().toISOString().slice(0, 10);
const equalShares = (members, total) => {
  const value = Number(total);
  if (!(value > 0) || !members.length) return {};
  const cents = Math.round(value * 100);
  const base = Math.floor(cents / members.length);
  return Object.fromEntries(members.map((member, index) => [member._id, ((base + (index < cents % members.length ? 1 : 0)) / 100).toFixed(2)]));
};

export default function SharedGroup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ description: "", total: "", splitMode: "equal", shares: {}, direction: "owed_to_me" });

  const load = () => Promise.all([api.get(`/shared-groups/${id}`), api.get("/debts")])
    .then(([groupResponse, debtResponse]) => {
      setGroup(groupResponse.data);
      setExpenses(debtResponse.data.filter((item) => item.group?._id === id || item.group === id));
      setError("");
    })
    .catch((err) => setError(err.response?.data?.message || "Could not load this shared group."));

  useEffect(() => { load(); }, [id]);

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const openSplit = () => {
    setForm({ description: "", total: "", splitMode: "equal", shares: equalShares(group.members, ""), direction: "owed_to_me" });
    setOpen(true);
  };
  const updateTotal = (event) => {
    const total = event.target.value;
    setForm({ ...form, total, shares: form.splitMode === "equal" ? equalShares(group.members, total) : form.shares });
  };
  const updateSplitMode = (event) => setForm({ ...form, splitMode: event.target.value, shares: event.target.value === "equal" ? equalShares(group.members, form.total) : form.shares });
  const updateShare = (memberId, value) => setForm({ ...form, shares: { ...form.shares, [memberId]: value } });
  const submit = async (event) => {
    event.preventDefault();
    const total = Number(form.total);
    const participants = group.members.map((member) => ({ member: member._id, name: member.name || member.email, share: Number(form.shares[member._id]) })).filter((participant) => participant.share > 0);
    const shareTotal = Math.round(participants.reduce((sum, participant) => sum + participant.share, 0) * 100) / 100;
    if (!form.description.trim() || !Number.isFinite(total) || total <= 0 || shareTotal !== total) {
      toast.error("Make sure the member shares add up to the full bill.");
      return;
    }
    const myShare = participants.find((participant) => participant.member === user?._id)?.share || 0;
    if (!myShare) return toast.error("Include your own share in the split.");
    setSaving(true);
    try {
      await api.post("/debts", {
        kind: "shared",
        group: id,
        person: participants.map((participant) => participant.name).join(", "),
        description: form.description,
        total,
        amountOwed: form.direction === "owed_to_me" ? total - myShare : myShare,
        direction: form.direction,
        participants,
        date: `${today()}T00:00:00.000Z`,
      });
      setForm({ description: "", total: "", splitMode: "equal", shares: {}, direction: "owed_to_me" });
      setOpen(false);
      toast.success("Shared expense added.");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add this shared expense.");
    } finally {
      setSaving(false);
    }
  };

  const openExpenses = useMemo(() => expenses.filter((item) => item.status === "open"), [expenses]);
  const totalShared = expenses.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const remaining = openExpenses.reduce((sum, item) => sum + Number(item.amountOwed || 0), 0);

  if (!group && !error) return <div className="p-6 text-sm text-slate-600">Loading group...</div>;

  return (
    <div className="w-full">
      {error && <ErrorBar message={error} onRetry={load} />}
      {group && <><button type="button" onClick={() => navigate("/debts")} className="mb-5 flex items-center gap-2 rounded-lg px-1 py-1 text-sm font-medium text-slate-600 transition hover:text-indigo-700"><ArrowLeft size={17} /> Back to Utang & Shared</button>
        <div className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-600 p-6 text-white shadow-lg sm:p-8">
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-white/10" />
          <div className="absolute -bottom-28 right-24 h-56 w-56 rounded-full bg-violet-400/20" />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="relative"><div className="mb-3 flex items-center gap-2 text-sm font-medium text-indigo-100"><Sparkles size={17} /> Shared expense group</div><h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{group.name}</h2><p className="mt-3 max-w-xl text-sm leading-6 text-indigo-100">Plan together, track every bill, and keep everyone updated in one place.</p></div>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(group.code); toast.success("Invite code copied."); }} className="relative flex items-center gap-2 rounded-lg border border-white/30 bg-white/15 px-3 py-2 text-sm font-semibold tracking-widest backdrop-blur transition hover:bg-white/25"><Copy size={16} /> {group.code}</button>
          </div>
          <div className="relative mt-7 flex flex-wrap items-center gap-3 text-sm text-indigo-100"><span className="flex items-center gap-2"><Users size={16} /> {group.members.length} member{group.members.length === 1 ? "" : "s"}</span><span className="text-indigo-300">·</span><span>Invite friends with the code above</span></div>
        </div>
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className={`${card} p-4`}><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700"><Receipt size={18} /></div><div className="text-sm text-slate-600">Total shared</div><div className="mt-1 text-2xl font-bold">{formatMoney(totalShared)}</div></div>
          <div className={`${card} p-4`}><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><WalletCards size={18} /></div><div className="text-sm text-slate-600">Still to settle</div><div className="mt-1 text-2xl font-bold text-amber-700">{formatMoney(remaining)}</div></div>
          <div className={`${card} p-4`}><div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-green-50 text-green-700"><CheckCircle2 size={18} /></div><div className="text-sm text-slate-600">Settled bills</div><div className="mt-1 text-2xl font-bold text-green-700">{expenses.length - openExpenses.length}</div></div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <section className={`${card} h-fit p-5`}><div className="flex items-center justify-between"><h3 className="font-semibold">Members</h3><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{group.members.length}</span></div><div className="mt-4 space-y-3">{group.members.map((member) => <div key={member._id} className="flex items-center gap-3 rounded-lg p-2 transition hover:bg-slate-50"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-violet-100 text-sm font-bold text-indigo-700">{(member.name || member.email || "?").slice(0, 1).toUpperCase()}</span><div className="min-w-0"><div className="truncate text-sm font-medium">{member.name || "Unnamed member"}</div><div className="truncate text-xs text-slate-500">{member.email}</div></div></div>)}</div></section>
          <section><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-xl font-bold">Shared expenses</h3><p className="mt-1 text-sm text-slate-600">{openExpenses.length} open expense{openExpenses.length === 1 ? "" : "s"} · everyone in the group can see updates</p></div><button type="button" onClick={openSplit} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"><Plus size={16} /> Split a bill</button></div>
            {!expenses.length ? <Empty icon={Receipt} title="Your group is ready" action={<button type="button" onClick={openSplit} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Add the first bill</button>}>Add dinner, travel, rent, or another bill so everyone knows what they owe.</Empty> : <div className="space-y-3">{expenses.map((item) => <article key={item._id} className={`${card} group flex flex-wrap items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md`}><div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${item.status === "settled" ? "bg-green-50 text-green-700" : item.direction === "owed_to_me" ? "bg-indigo-50 text-indigo-700" : "bg-rose-50 text-rose-700"}`}><ArrowUpRight size={19} /></div><div className="min-w-0 flex-1"><div className="truncate font-semibold">{item.description}</div><div className="mt-1 text-sm text-slate-600">{item.person} · {item.direction === "owed_to_me" ? "owes me" : "I owe"}</div>{item.participants?.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{item.participants.map((participant) => <span key={participant.member} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{participant.name}: {formatMoney(participant.share)}</span>)}</div>}</div><div className="text-right"><div className={`text-lg font-bold ${item.status === "settled" ? "text-green-700" : "text-slate-900"}`}>{formatMoney(item.amountOwed)}</div><span className={`text-xs font-medium ${item.status === "settled" ? "text-green-700" : "text-amber-700"}`}>{item.status === "settled" ? "Settled" : "Open"}</span></div></article>)}</div>}
          </section>
        </div>
        {open && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-lg font-semibold">Split a bill</h3><p className="text-xs text-slate-500">Choose how much each member owes.</p></div><button type="button" onClick={() => setOpen(false)} className="text-slate-500">Close</button></div><form onSubmit={submit} className="space-y-3"><label className="block text-sm font-medium">What was the expense?<input name="description" value={form.description} onChange={update} placeholder="e.g. Dinner" className={field} required /></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Full bill<input name="total" type="number" min="0.01" step="0.01" value={form.total} onChange={updateTotal} className={field} required /></label><label className="block text-sm font-medium">Split type<select name="splitMode" value={form.splitMode} onChange={updateSplitMode} className={field}><option value="equal">Split equally</option><option value="custom">Custom shares</option></select></label></div><label className="block text-sm font-medium">Who owes whom?<select name="direction" value={form.direction} onChange={update} className={field}><option value="owed_to_me">They owe me</option><option value="i_owe">I owe them</option></select></label><div className="rounded-lg border border-slate-200 p-3"><div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wide text-slate-500"><span>Member shares</span><span>{formatMoney(Number(form.total || 0))} total</span></div><div className="space-y-2">{group.members.map((member) => <label key={member._id} className="flex items-center gap-2 text-sm"><span className="min-w-0 flex-1 truncate">{member.name || member.email}{member._id === user?._id ? " (you)" : ""}</span><input type="number" min="0.01" step="0.01" value={form.shares[member._id] || ""} onChange={(event) => updateShare(member._id, event.target.value)} disabled={form.splitMode === "equal"} className={`${field} max-w-32`} /></label>)}</div></div><button type="submit" disabled={saving} className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white disabled:opacity-60">{saving ? "Saving..." : "Add shared expense"}</button></form></div></div>}
      </>}
    </div>
  );
}
