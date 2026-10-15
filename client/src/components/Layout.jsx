import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useSearchParams } from "react-router-dom";
import {
  LayoutDashboard, Landmark, ArrowLeftRight, Gauge, CalendarClock, Target, BarChart3, Settings,
  LogOut, Menu, X, Plus, Wallet,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TransactionModal from "./TransactionModal";

const LINKS = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/accounts", label: "Accounts", icon: Landmark },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/budgets", label: "Budgets", icon: Gauge },
  { to: "/bills", label: "Bills & Subscriptions", icon: CalendarClock },
  { to: "/goals", label: "Goals", icon: Target },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

const navClass = ({ isActive }) =>
  `relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
  }`;

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-zinc-950">
        <Wallet size={18} />
      </span>
      <span className="text-lg font-semibold tracking-tight">PocketWise</span>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [params, setParams] = useSearchParams();
  const close = () => setOpen(false);

  // Opened from the app-icon shortcut (/?add=1): show the add popup right away
  useEffect(() => {
    if (params.get("add")) {
      setAddOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const name = user?.name || "";
  const initials = name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="min-h-screen w-full bg-[#f6f7fb] text-slate-900 lg:flex">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-zinc-950 px-4 py-3 text-white lg:hidden">
        <Brand />
        <button onClick={() => setOpen(true)} className="rounded-xl bg-white/10 p-2 hover:bg-white/15" aria-label="Open menu">
          <Menu size={20} />
        </button>
      </header>

      {open && <div className="animate-fade fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden" onClick={close} />}

      {/* Black side panel, white accents only */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto border-r border-white/5 bg-zinc-950 p-4 text-white transition-transform duration-200 [&_a:focus-visible]:outline-white [&_button:focus-visible]:outline-white
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}
      >
        <div className="mb-8 flex items-center justify-between px-1">
          <Brand />
          <button onClick={close} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <div className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">Menu</div>
        <nav className="grid flex-1 content-start gap-1">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={close} className={navClass}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-white" />}
                  <Icon size={18} className={isActive ? "text-white" : ""} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-zinc-950">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{name}</div>
            <div className="truncate text-xs text-zinc-500">{user?.email}</div>
          </div>
          <button onClick={logout} title="Log out" aria-label="Log out"
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/10 hover:text-white">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-10">
        <div key={`${location.pathname}-${refresh}`} className="animate-rise">
          <Outlet />
        </div>
      </main>

      {/* Quick add on phones */}
      <button
        onClick={() => setAddOpen(true)}
        aria-label="Quick add transaction"
        className="fixed bottom-5 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-xl shadow-indigo-500/40 transition-transform active:scale-95 lg:hidden"
      >
        <Plus size={28} />
      </button>

      <TransactionModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => setRefresh((k) => k + 1)} />
    </div>
  );
}