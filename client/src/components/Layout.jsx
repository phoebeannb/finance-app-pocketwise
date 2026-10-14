import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Landmark, ArrowLeftRight, BarChart3, Settings, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const LINKS = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/accounts", label: "Accounts", icon: Landmark },
  { to: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
    isActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-700"
  }`;

export default function Layout() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="min-h-screen w-full bg-slate-100 text-slate-800 lg:flex">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-slate-800 px-4 py-3 text-white lg:hidden">
        <span className="text-lg font-bold">PocketWise</span>
        <button onClick={() => setOpen(true)} className="rounded-lg bg-slate-700 p-2" aria-label="Open menu">
          <Menu size={20} />
        </button>
      </header>

      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={close} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto bg-slate-800 p-3 text-white transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full"}
          lg:sticky lg:top-0 lg:h-screen lg:translate-x-0`}
      >
        <div className="mx-2 mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">PocketWise</h1>
          <button onClick={close} className="rounded-lg p-1 hover:bg-slate-700 lg:hidden" aria-label="Close menu">
            <X size={20} />
          </button>
        </div>

        <nav className="grid flex-1 content-start gap-1">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={close} className={linkClass}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
        </nav>

        <div className="mx-2 mb-2 mt-4 truncate text-sm opacity-70">{user.name}</div>
        <button onClick={logout} className="flex items-center justify-center gap-2 rounded-lg bg-slate-700 p-2.5 hover:bg-slate-600">
          <LogOut size={16} /> Log out
        </button>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
}