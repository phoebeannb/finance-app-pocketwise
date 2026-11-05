import { useEffect, useState } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../api/axios";
import Modal from "./Modal";

const tone = { red: "bg-red-50 text-red-700", amber: "bg-amber-50 text-amber-700", indigo: "bg-indigo-50 text-indigo-700", green: "bg-green-50 text-green-700" };

export default function NotificationCenter({ compact = false }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const load = () => api.get("/notifications").then(({ data }) => { setItems(data); setError(""); }).catch(() => setError("Notifications are temporarily unavailable."));
  useEffect(() => { load(); const timer = setInterval(load, 5 * 60 * 1000); return () => clearInterval(timer); }, []);
  const unread = items.filter((item) => !item.readAt);
  const markRead = async (id) => { await api.post(`/notifications/${id}/read`, {}, { quiet: true }); setItems((current) => current.map((item) => item._id === id ? { ...item, readAt: new Date().toISOString() } : item)); };
  return <><button type="button" onClick={() => { setOpen(true); load(); }} aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ""}`} title="Notifications" className={`${compact ? "" : "fixed right-4 top-4 z-30 sm:right-6 sm:top-6 lg:right-8 lg:top-8"} relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm`}><Bell size={18} />{unread.length > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{unread.length > 9 ? "9+" : unread.length}</span>}</button><Modal open={open} onClose={() => setOpen(false)} title="Notifications">{error && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}{items.length === 0 ? <div className="flex flex-col items-center py-8 text-center"><CheckCircle2 className="mb-3 text-green-600" size={32} /><p className="font-semibold">You’re all caught up</p></div> : <ul className="space-y-2">{items.map((item) => <li key={item._id}><Link to={item.to} onClick={() => { markRead(item._id); setOpen(false); }} className={`flex items-start gap-3 rounded-xl p-3 hover:bg-slate-50 ${item.readAt ? "opacity-60" : ""}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${tone[item.tone]}`}><Bell size={17} /></span><span><span className="block text-sm font-semibold">{item.title}</span><span className="mt-0.5 block text-xs text-slate-600">{item.detail}</span></span></Link></li>)}</ul>}{unread.length > 0 && <button onClick={async () => { await api.post("/notifications/read-all", {}, { quiet: true }); setItems((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() }))); }} className="mt-4 w-full rounded-lg border border-slate-300 py-2 text-sm font-medium">Mark all as read</button>}</Modal></>;
}
