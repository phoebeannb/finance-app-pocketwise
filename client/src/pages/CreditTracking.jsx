import { useEffect, useState } from "react";
import { CreditCard, Plus, WalletCards } from "lucide-react";
import api from "../api/axios";
import { formatMoney } from "../utils/format";
import Modal from "../components/Modal";
import { ErrorBar, Empty, card } from "../components/ui";

const blank = { nickname: "", issuer: "", network: "Visa", kind: "Credit", last4: "", dueDay: "", creditLimit: "", currentBalance: "" };
const field = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";

export default function CreditTracking() {
  const [cards, setCards] = useState(null);
  const [form, setForm] = useState(blank);
  const [payment, setPayment] = useState({ amount: "", note: "" });
  const [open, setOpen] = useState(false);
  const [paymentCard, setPaymentCard] = useState(null);
  const [error, setError] = useState("");
  const load = () => api.get("/cards").then(({ data }) => setCards(data)).catch(() => setError("Could not load credit tracking."));
  useEffect(() => { load(); }, []);
  const save = async (event) => {
    event.preventDefault();
    try { await api.post("/cards", { ...form, dueDay: form.dueDay || null, creditLimit: form.creditLimit || null, currentBalance: form.currentBalance || 0 }); setOpen(false); setForm(blank); load(); }
    catch (err) { setError(err.response?.data?.message || "Could not save this card."); }
  };
  const savePayment = async (event) => {
    event.preventDefault();
    try { await api.post(`/cards/${paymentCard._id}/payments`, payment); setPaymentCard(null); setPayment({ amount: "", note: "" }); load(); }
    catch (err) { setError(err.response?.data?.message || "Could not record this payment."); }
  };
  if (error && !cards) return <ErrorBar message={error} onRetry={load} />;
  if (!cards) return <p className="text-slate-600">Loading...</p>;
  return <div className="w-full">
    <div className="mb-6 flex items-start justify-between gap-3"><div><h2 className="text-2xl font-semibold">Credit Tracking</h2><p className="mt-1 text-sm text-slate-600">Track balances, utilization, limits, and payment history.</p></div><button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white"><Plus size={16} /> Add card</button></div>
    {cards.length === 0 ? <Empty icon={CreditCard} title="No cards yet">Add a credit card to start tracking its limit and payments.</Empty> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{cards.map((item) => {
      const utilization = item.utilization == null ? null : Math.min(item.utilization, 100);
      return <div key={item._id} className={`${card} p-5`}><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700"><CreditCard size={19} /></span><div><h3 className="font-semibold">{item.nickname}</h3><p className="text-xs text-slate-500">{item.issuer || item.network}{item.last4 ? ` · •••• ${item.last4}` : ""}</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><p className="text-slate-500">Outstanding</p><p className="font-semibold">{formatMoney(item.currentBalance || 0)}</p></div><div><p className="text-slate-500">Limit</p><p className="font-semibold">{item.creditLimit == null ? "—" : formatMoney(item.creditLimit)}</p></div></div>{utilization != null && <div className="mt-4"><div className="flex justify-between text-xs text-slate-500"><span>Utilization</span><span>{utilization.toFixed(0)}%</span></div><div className="mt-1 h-2 rounded-full bg-slate-100"><div className={`h-2 rounded-full ${utilization >= 80 ? "bg-red-500" : utilization >= 30 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${utilization}%` }} /></div></div>}<p className="mt-3 text-xs text-slate-500">{item.dueDay ? `Payment due day ${item.dueDay}` : "No due date set"} · {item.payments?.length || 0} payments</p><button onClick={() => setPaymentCard(item)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"><WalletCards size={16} /> Record payment</button></div>;
    })}</div>}
    <Modal open={open} onClose={() => setOpen(false)} title="Add credit card"><form onSubmit={save} className="space-y-3"><input className={field} placeholder="Card nickname" value={form.nickname} onChange={(e) => setForm({ ...form, nickname: e.target.value })} required /><input className={field} placeholder="Issuer, e.g. BPI" value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} /><div className="grid grid-cols-2 gap-3"><select className={field} value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })}>{["Visa", "Mastercard", "JCB", "American Express", "Other"].map((x) => <option key={x}>{x}</option>)}</select><input className={field} inputMode="numeric" maxLength={4} placeholder="Last 4 digits" value={form.last4} onChange={(e) => setForm({ ...form, last4: e.target.value.replace(/\D/g, "") })} /></div><div className="grid grid-cols-2 gap-3"><input className={field} type="number" min="1" max="31" placeholder="Due day" value={form.dueDay} onChange={(e) => setForm({ ...form, dueDay: e.target.value })} /><input className={field} type="number" min="0" step="0.01" placeholder="Credit limit" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} /></div><input className={field} type="number" min="0" step="0.01" placeholder="Current outstanding balance" value={form.currentBalance} onChange={(e) => setForm({ ...form, currentBalance: e.target.value })} /><button className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white">Save card</button></form></Modal>
    <Modal open={!!paymentCard} onClose={() => setPaymentCard(null)} title={`Record payment · ${paymentCard?.nickname || ""}`}><form onSubmit={savePayment} className="space-y-3"><p className="text-sm text-slate-600">Outstanding: {formatMoney(paymentCard?.currentBalance || 0)}</p><input className={field} type="number" min="0.01" step="0.01" placeholder="Payment amount" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} required /><input className={field} placeholder="Note (optional)" value={payment.note} onChange={(e) => setPayment({ ...payment, note: e.target.value })} /><button className="w-full rounded-lg bg-indigo-600 py-2.5 font-medium text-white">Save payment</button></form></Modal>
  </div>;
}
