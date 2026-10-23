import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Modal from "./Modal";
import { formatMoney } from "../utils/format";

const daysUntil = (iso) => {
  const date = new Date(iso);
  const now = new Date();
  return Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000);
};

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ bills: [], budgets: [], accounts: [], debts: [] });
  const [loaded, setLoaded] = useState(false);

  const load = () => Promise.all([
    api.get("/recurring").catch(() => ({ data: [] })),
    api.get("/budgets").catch(() => ({ data: [] })),
    api.get("/accounts").catch(() => ({ data: [] })),
    api.get("/debts").catch(() => ({ data: [] })),
  ]).then(([bills, budgets, accounts, debts]) => {
    setData({ bills: bills.data, budgets: budgets.data, accounts: accounts.data, debts: debts.data });
    setLoaded(true);
  });

  useEffect(() => { load(); const timer = setInterval(load, 5 * 60 * 1000); return () => clearInterval(timer); }, []);

  const notifications = useMemo(() => {
    const dueBills = data.bills.filter((bill) => bill.active && bill.type === "expense").map((bill) => {
      const days = daysUntil(bill.nextDate);
      return days <= (bill.reminderDays ?? 3) ? {
        id: `bill-${bill._id}`, icon: CalendarClock, tone: days < 0 ? "red" : "amber",
        title: days < 0 ? `${bill.name} is overdue` : `${bill.name} is due ${days === 0 ? "today" : `in ${days} days`}`,
        detail: formatMoney(bill.amount), to: "/bills",
      } : null;
    }).filter(Boolean);
    const budgets = data.budgets.filter((budget) => budget.limit > 0 && budget.spent >= budget.limit * 0.8).map((budget) => ({
      id: `budget-${budget._id}`, icon: WalletCards, tone: budget.spent >= budget.limit ? "red" : "amber",
      title: budget.spent >= budget.limit ? `${budget.category} is over budget` : `${budget.category} is near its limit`,
      detail: `${formatMoney(budget.spent)} of ${formatMoney(budget.limit)}`, to: "/budgets",
    }));
    const accounts = data.accounts.filter((account) => account.currentBalance < 0).map((account) => ({
      id: `account-${account._id}`, icon: AlertTriangle, tone: "red",
      title: `${account.name} has a negative balance`, detail: formatMoney(Math.abs(account.currentBalance)), to: "/accounts",
    }));
    const debts = data.debts.filter((debt) => debt.status === "open" && debt.group).map((debt) => ({
      id: `debt-${debt._id}`, icon: Bell, tone: "indigo",
      title: `Shared expense: ${debt.description}`, detail: `${formatMoney(debt.amountOwed)} remaining`, to: "/debts",
    }));
    return [...dueBills, ...budgets, ...accounts, ...debts].slice(0, 12);
  }, [data]);

  const tone = { red: "bg-red-50 text-red-700", amber: "bg-amber-50 text-amber-700", indigo: "bg-indigo-50 text-indigo-700" };

  return <>
    <button type="button" onClick={() => { setOpen(true); load(); }} aria-label={`Notifications${notifications.length ? `, ${notifications.length} unread` : ""}`} title="Notifications"
      className="fixed right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-md hover:border-indigo-200 hover:text-indigo-700 sm:right-6 sm:top-6 lg:right-8 lg:top-8">
      <Bell size={18} />
      {notifications.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{notifications.length > 9 ? "9+" : notifications.length}</span>}
    </button>
    <Modal open={open} onClose={() => setOpen(false)} title="Notifications">
      {!loaded ? <p className="py-6 text-center text-sm text-slate-600">Checking your finances...</p> : notifications.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center"><CheckCircle2 className="mb-3 text-green-600" size={32} /><p className="font-semibold">You’re all caught up</p><p className="mt-1 text-sm text-slate-600">No bills, budgets, or shared expenses need your attention.</p></div>
      ) : <ul className="space-y-2">{notifications.map((item) => { const Icon = item.icon; return <li key={item.id}><Link to={item.to} onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-xl p-3 hover:bg-slate-50"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone[item.tone]}`}><Icon size={17} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-800">{item.title}</span><span className="mt-0.5 block text-xs text-slate-600">{item.detail}</span></span></Link></li>; })}</ul>}
    </Modal>
  </>;
}
