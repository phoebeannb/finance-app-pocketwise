import { useCallback, useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useSearchParams } from "react-router-dom";
import {
  LayoutDashboard, Landmark, ArrowLeftRight, Gauge, CalendarClock, Target, BarChart3, Settings,
  LogOut, Plus, Wallet, MoreHorizontal, PanelLeftOpen, PanelLeftClose, Users,
} from "lucide-react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import { QuickAddContext } from "../context/QuickAddContext";
import TransactionModal from "./TransactionModal";
import QuickAdd from "./QuickAdd";
import BillQuickAdd from "./BillQuickAdd";
import Modal from "./Modal";
import Shortcuts from "./Shortcuts";
import ConfirmModal from "./ConfirmModal";
import NotificationCenter from "./NotificationCenter";

const OVERVIEW = { to: "/", label: "Overview", icon: LayoutDashboard, end: true };
const ACCOUNTS = { to: "/accounts", label: "Accounts", icon: Landmark };
const TRANSACTIONS = { to: "/transactions", label: "Transactions", icon: ArrowLeftRight };
const DEBTS = { to: "/debts", label: "Utang & Shared", icon: Users };
const BUDGETS = { to: "/budgets", label: "Budgets", icon: Gauge, badge: "budgets" };
const BILLS = { to: "/bills", label: "Bills", icon: CalendarClock, badge: "bills" };
const GOALS = { to: "/goals", label: "Goals", icon: Target };
const REPORTS = { to: "/reports", label: "Reports", icon: BarChart3 };
const SETTINGS = { to: "/settings", label: "Settings", icon: Settings };

const GROUPS = [
  { title: "Money", links: [OVERVIEW, ACCOUNTS, TRANSACTIONS, DEBTS] },
  { title: "Planning", links: [BUDGETS, BILLS, GOALS] },
  { title: "Analysis", links: [REPORTS] },
];
const MORE = [ACCOUNTS, TRANSACTIONS, DEBTS, BILLS, GOALS, REPORTS, SETTINGS];

const daysUntil = (iso) => {
  const d = new Date();
  const today = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((new Date(iso).getTime() - today) / 86400000);
};

// How many budgets are used up, and how many bills are due within 3 days
function useBadges(trigger) {
  const [badges, setBadges] = useState({ budgets: 0, bills: 0 });
  useEffect(() => {
    let alive = true;
    const load = () =>
      Promise.all([api.get("/budgets"), api.get("/recurring")])
        .then(([b, r]) => {
          if (!alive) return;
          setBadges({
            budgets: b.data.filter((x) => x.limit > 0 && x.spent >= x.limit).length,
            bills: r.data.filter((x) => x.active && x.type === "expense" && daysUntil(x.nextDate) <= 3).length,
          });
        })
        .catch(() => {});
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    return () => { alive = false; clearInterval(t); };
  }, [trigger]);
  return badges;
}

const badgeText = (key, n) => (key === "budgets" ? `${n} over budget` : `${n} due soon`);
const badgeColor = (key) => (key === "budgets" ? "bg-red-600" : "bg-amber-600");

function Brand({ labels }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-zinc-950">
        <Wallet size={17} aria-hidden="true" />
      </span>
      {labels && <span className="text-lg font-semibold">PocketWise</span>}
    </div>
  );
}

function NavItem({ item, labels, badges }) {
  const count = item.badge ? badges[item.badge] : 0;
  return (
    <NavLink to={item.to} end={item.end} title={labels ? undefined : item.label} aria-label={labels ? undefined : item.label}
      className={({ isActive }) =>
        `relative flex items-center rounded-lg text-sm font-medium ${labels ? "gap-3 px-3 py-2.5" : "h-11 w-11 justify-center"} ${
          isActive ? "bg-white/10 text-white" : "text-zinc-300 hover:bg-white/5 hover:text-white"
        }`}>
      <item.icon className="nav-icon" size={18} aria-hidden="true" />
      {labels && <span className="flex-1">{item.label}</span>}
      {count > 0 && (labels ? (
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${badgeColor(item.badge)}`}>
          {count}<span className="sr-only"> {badgeText(item.badge, count)}</span>
        </span>
      ) : (
        <span className={`absolute right-1 top-1 h-2.5 w-2.5 rounded-full ${badgeColor(item.badge)}`}>
          <span className="sr-only">{badgeText(item.badge, count)}</span>
        </span>
      ))}
    </NavLink>
  );
}

// The side menu, used full-width on desktop and as an icon rail on tablets
function SideNav({ labels, onToggle, badges, user, onLogout }) {
  const name = user?.name || "";
  const initials = name.split(" ").filter(Boolean).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
  return (
    <div className="flex h-full flex-col p-3">
      <div className={`mb-6 flex items-center ${labels ? "justify-between px-1" : "flex-col gap-3"}`}>
        <Brand labels={labels} />
        {onToggle && (
          <button type="button" onClick={onToggle} aria-label={labels ? "Collapse the menu" : "Show menu labels"}
            title={labels ? "Collapse the menu" : "Show menu labels"}
            className="rounded-lg p-2 text-zinc-300 hover:bg-white/10 hover:text-white">
            {labels ? <PanelLeftClose size={18} aria-hidden="true" /> : <PanelLeftOpen size={18} aria-hidden="true" />}
          </button>
        )}
      </div>

      <nav aria-label="Main" className="flex-1 space-y-4 overflow-y-auto">
        {GROUPS.map((g) => (
          <div key={g.title}>
            {labels
              ? <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{g.title}</div>
              : <div className="mx-auto mb-2 h-px w-6 bg-white/10" aria-hidden="true" />}
            <div className={`grid gap-1 ${labels ? "" : "justify-items-center"}`}>
              {g.links.map((l) => <NavItem key={l.to} item={l} labels={labels} badges={badges} />)}
            </div>
          </div>
        ))}
      </nav>

      <div className={`mt-4 border-t border-white/10 pt-3 ${labels ? "" : "grid justify-items-center gap-2"}`}>
        <NavItem item={SETTINGS} labels={labels} badges={badges} />
        <div className={`mt-2 flex items-center gap-3 ${labels ? "px-1" : "flex-col"}`}>
          <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-zinc-950">
            {initials}
          </span>
          {labels && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{name}</div>
              <div className="truncate text-xs text-zinc-400">{user?.email}</div>
            </div>
          )}
          <button type="button" onClick={onLogout} title="Log out" aria-label="Log out"
            className="flex items-center gap-2 rounded-lg p-2 text-sm text-zinc-300 hover:bg-white/10 hover:text-white">
            <LogOut size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function TabLink({ item, badges }) {
  const count = item.badge ? badges[item.badge] : 0;
  return (
    <NavLink to={item.to} end={item.end}
      className={({ isActive }) =>
        `relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${isActive ? "text-indigo-700" : "text-slate-600"}`}>
      <item.icon className="nav-icon" size={22} aria-hidden="true" />
      {item.label}
      {count > 0 && (
        <span className={`absolute right-[22%] top-2 h-2.5 w-2.5 rounded-full ${badgeColor(item.badge)}`}>
          <span className="sr-only">{badgeText(item.badge, count)}</span>
        </span>
      )}
    </NavLink>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [wide, setWide] = useState(false); // tablet rail: show labels or not
  const [quickOpen, setQuickOpen] = useState(false);
  const [billQuickOpen, setBillQuickOpen] = useState(false);
  const [quickInitial, setQuickInitial] = useState(null);
  const [fullOpen, setFullOpen] = useState(false);
  const [fullInitial, setFullInitial] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [params, setParams] = useSearchParams();
  const badges = useBadges(`${location.pathname}-${refresh}`);

  const saved = useCallback(() => setRefresh((k) => k + 1), []);
  const ctx = useMemo(() => ({
    open: (initial) => { setQuickInitial(initial || null); setQuickOpen(true); },
    openBill: () => setBillQuickOpen(true),
    refresh: saved,
  }), [saved]);
  const openFull = (initial) => { setFullInitial(initial || null); setQuickOpen(false); setFullOpen(true); };
  const requestLogout = () => {
    setMoreOpen(false);
    setLogoutOpen(true);
  };

  // Opened from the installed app's shortcut (/?add=1)
  useEffect(() => {
    if (params.get("add")) {
      setQuickOpen(true);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  return (
    <QuickAddContext.Provider value={ctx}>
      <div className="app-shell min-h-screen w-full bg-[#f4f5f7] text-slate-900 sm:flex">
        <a href="#main-content" className="sr-only fixed left-3 top-3 z-[100] rounded-lg bg-white px-4 py-3 font-medium text-indigo-700 shadow-lg focus:not-sr-only">
          Skip to main content
        </a>
        {/* Desktop: full side menu */}
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-gradient-to-b from-zinc-950 to-zinc-900 text-white shadow-xl lg:block">
          <SideNav labels badges={badges} user={user} onLogout={requestLogout} />
        </aside>

        {/* Tablet: icon rail (tap the arrow to show names) */}
        <aside className={`sticky top-0 hidden h-screen shrink-0 bg-gradient-to-b from-zinc-950 to-zinc-900 text-white shadow-xl sm:block lg:hidden ${wide ? "w-56" : "w-[72px]"}`}>
          <SideNav labels={wide} onToggle={() => setWide((w) => !w)} badges={badges} user={user} onLogout={requestLogout} />
        </aside>

        <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 p-4 pb-28 outline-none sm:p-6 sm:pb-8 lg:p-8">
          {/* Changing the key reloads the page you're on, so new data shows up after saving */}
          <div key={refresh}>
            <Outlet />
          </div>
        </main>

        {/* Phone: bottom tab bar */}
        <nav aria-label="Main" className="app-surface pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 shadow-[0_-4px_18px_rgb(15_23_42_/_0.08)] backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-md items-end justify-around px-2">
            <TabLink item={OVERVIEW} badges={badges} />
            <TabLink item={TRANSACTIONS} badges={badges} />
            <div className="flex flex-1 justify-center">
              <button type="button" onClick={() => setQuickOpen(true)} aria-label="Add transaction"
                className="-mt-5 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md ring-4 ring-white hover:bg-indigo-700">
                <Plus size={28} aria-hidden="true" />
              </button>
            </div>
            <TabLink item={BUDGETS} badges={badges} />
            <button type="button" onClick={() => setMoreOpen(true)} aria-expanded={moreOpen} aria-haspopup="dialog"
              className="relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-600">
              <MoreHorizontal size={22} aria-hidden="true" />
              More
              {badges.bills > 0 && (
                <span className="absolute right-[22%] top-2 h-2.5 w-2.5 rounded-full bg-amber-600">
                  <span className="sr-only">{badgeText("bills", badges.bills)}</span>
                </span>
              )}
            </button>
          </div>
        </nav>

        <Shortcuts onAdd={() => setQuickOpen(true)} onLogout={requestLogout} />
        {location.pathname === "/" && <NotificationCenter />}
        <QuickAdd open={quickOpen} initial={quickInitial} onClose={() => setQuickOpen(false)} onSaved={saved} onMore={openFull} />
        <BillQuickAdd open={billQuickOpen} onClose={() => setBillQuickOpen(false)} onSaved={saved} />
        <TransactionModal open={fullOpen} initial={fullInitial} onClose={() => setFullOpen(false)} onSaved={saved} />

        <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
          <ul className="divide-y divide-slate-100">
            {MORE.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to} onClick={() => setMoreOpen(false)}
                  className="flex min-h-12 items-center gap-3 py-2 text-base font-medium text-slate-800">
                  <l.icon size={20} className="text-slate-500" aria-hidden="true" />
                  <span className="flex-1">{l.label}</span>
                  {l.badge && badges[l.badge] > 0 && (
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${badgeColor(l.badge)}`}>
                      {badges[l.badge]}<span className="sr-only"> {badgeText(l.badge, badges[l.badge])}</span>
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
            <li>
              <button type="button" onClick={requestLogout} className="flex min-h-12 w-full items-center gap-3 py-2 text-base font-medium text-red-600">
                <LogOut size={20} aria-hidden="true" /> Log out
              </button>
            </li>
          </ul>
        </Modal>
        <ConfirmModal
          open={logoutOpen}
          title="Log out?"
          message="Are you sure you want to log out of PocketWise?"
          confirmLabel="Log out"
          onClose={() => setLogoutOpen(false)}
          onConfirm={logout}
        />
      </div>
    </QuickAddContext.Provider>
  );
}