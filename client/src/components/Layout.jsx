import { useEffect, useState } from "react";
import { NavLink, Outlet, useSearchParams } from "react-router-dom";
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
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
    isActive ? "bg-white/10 text-white" : "text-zinc-400 hover:bg-white/5 hover:text-white"
  }`;

function Brand() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-zinc-950">
        <Wallet size={17} />
      </span>
      <span className="text-lg font-semibold">PocketWise</span>
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [params, setParams] = useSearchParams();
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === "Escape") close();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  // Opened from the installed app's shortcut (/?add=1)
  useEffect(() => {
    if (params.get("add")) {
      setAddOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const name = user?.name || "";
  const initials = name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="min-h-screen w-full bg-[#f4f5f7] text-slate-900 lg:flex">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-zinc-950 px-4 py-3 text-white lg:hidden">
        <Brand />
        <button onClick={() => setOpen(true)} className="rounded-lg bg-white/10 p-2 hover:bg-white/15"
          aria-label="Open menu" aria-expanded={open} aria-controls="app-navigation">
          <Menu size={20} />
        </button>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={close} />}

      <aside
        id="app-navigation"
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto bg-zinc-950 p-4 text-white transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}
        aria-label="Main navigation"
      >
        <div className="mb-8 flex items-center justify-between px-1">
          <Brand />
          <button onClick={close} className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white lg:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="grid flex-1 content-start gap-1">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={close} className={navClass}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-zinc-950">
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

      <main className="min-w-0 flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8">
        {/* Changing the key reloads the page after a save from the quick-add button */}
        <div key={refresh}>
          <Outlet />
        </div>
      </main>

      {/* Quick add on phones */}
      <button
        onClick={() => setAddOpen(true)}
        aria-label="Quick add transaction"
        className="quick-add-button fixed z-30 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md hover:bg-indigo-700 lg:hidden"
      >
        <Plus size={26} />
      </button>

      <TransactionModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={() => setRefresh((k) => k + 1)} />
    </div>
  );
}