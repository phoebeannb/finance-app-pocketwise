import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Plus, Users } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import { toast } from "../utils/toast";
import { ErrorBar, Empty, card } from "../components/ui";

const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const today = () => new Date().toISOString().slice(0, 10);

export default function SharedGroup() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ person: "", description: "", total: "", myShare: "", direction: "owed_to_me" });

  const load = () => Promise.all([api.get(`/shared-groups/${id}`), api.get("/debts")])
    .then(([groupResponse, debtResponse]) => {
      setGroup(groupResponse.data);
      setExpenses(debtResponse.data.filter((item) => item.group?._id === id || item.group === id));
      setError("");
    })
    .catch((err) => setError(err.response?.data?.message || "Could not load this shared group."));

  useEffect(() => { load(); }, [id]);

  const update = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    const total = Number(form.total);
    const myShare = Number(form.myShare);
    const amountOwed = form.direction === "owed_to_me" ? total - myShare : myShare;
    if (!form.person || !form.description.trim() || !Number.isFinite(total) || total <= 0 || !Number.isFinite(amountOwed) || amountOwed <= 0 || amountOwed > total) {
      toast.error("Enter a valid member, bill total, and share.");
      return;
    }
    setSaving(true);
    try {
      await api.post("/debts", {
        kind: "shared",
        group: id,
        person: form.person,
        description: form.description,
        total,
        amountOwed,
        direction: form.direction,
        date: `${today()}T00:00:00.000Z`,
      });
      setForm({ person: "", description: "", total: "", myShare: "", direction: "owed_to_me" });
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

  if (!group && !error) return <div className="p-6 text-sm text-slate-600">Loading group...</div>;

  return (
    <div className="w-full">
      {error && <ErrorBar message={error} onRetry={load} />}
      {group && <><button type="button" onClick={() => navigate("/debts")} className="mb-5 flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-indigo-700"><ArrowLeft size={17} /> Back to Utang & Shared</button>
        <div className={`${card} mb-6 border-indigo-100 bg-indigo-50/50 p-6`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><div className="mb-2 flex items-center gap-2 text-sm font-medium text-indigo-700"><Users size={18} /> Shared expense group</div><h2 className="text-3xl font-semibold">{group.name}</h2><p className="mt-2 text-sm text-slate-600">Choose a member when adding a bill. Everyone in this group can see these shared expenses.</p></div>
            <button type="button" onClick={() => { navigator.clipboard?.writeText(group.code); toast.success("Invite code copied."); }} className="flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-semibold tracking-widest text-indigo-800 hover:bg-indigo-50"><Copy size={16} /> {group.code}</button>
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <section className={`${card} p-5`}><h3 className="font-semibold">Members ({group.members.length})</h3><div className="mt-4 space-y-3">{group.members.map((member) => <div key={member._id} className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">{(member.name || member.email || "?").slice(0, 1).toUpperCase()}</span><div className="min-w-0"><div className="truncate text-sm font-medium">{member.name || "Unnamed member"}</div><div className="truncate text-xs text-slate-500">{member.email}</div></div></div>)}</div></section>
          <section><div className="mb-3 flex items-center justify-between gap-3"><div><h3 className="text-xl font-semibold">Shared expenses</h3><p className="text-sm text-slate-600">{openExpenses.length} open expense{openExpenses.length === 1 ? "" : "s"}</p></div><button type="button" onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"><Plus size={16} /> Split a bill</button></div>
            {!expenses.length ? <Empty icon={Users} title="No shared expenses yet" action={<button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">Add the first bill</button>}>Add dinner, travel, rent, or another bill and choose who it belongs to.</Empty> : <div className="space-y-3">{expenses.map((item) => <article key={item._id} className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}><div><div className="font-semibold">{item.description}</div><div className="text-sm text-slate-600">{item.person} · {item.direction === "owed_to_me" ? "owes me" : "I owe"} · {item.status}</div></div><div className="text-lg font-semibold">{formatMoney(item.amountOwed)}</div></article>)}</div>}
          </section>
        </div>
        {open && <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 sm:items-center"><div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">Split a bill</h3><button type="button" onClick={() => setOpen(false)} className="text-slate-500">Close</button></div><form onSubmit={submit} className="space-y-3"><label className="block text-sm font-medium">Who is this for?<select name="person" value={form.person} onChange={update} className={field} required><option value="">Choose a member</option>{group.members.map((member) => <option key={member._id} value={member.name || member.email}>{member.name || member.email}</option>)}</select></label><label className="block text-sm font-medium">What was the expense?<input name="description" value={form.description} onChange={update} placeholder="e.g. Dinner" className={field} required /></label><label className="block text-sm font-medium">Who owes whom?<select name="direction" value={form.direction} onChange={update} className={field}><option value="owed_to_me">They owe me</option><option value="i_owe">I owe them</option></select></label><div className="grid grid-cols-2 gap-3"><label className="block text-sm font-medium">Full bill<input name="total" type="number" min="0.01" step="0.01" value={form.total} onChange={update} className={field} required /></label><label className="block text-sm font-medium">My share<input name="myShare" type="number" min="0" step="0.01" value={form.myShare} onChange={update} className={field} required /></label></div><button type="submit" disabled={saving} className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white disabled:opacity-60">{saving ? "Saving..." : "Add shared expense"}</button></form></div></div>}
      </>}
    </div>
  );
}
