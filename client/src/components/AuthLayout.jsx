import { Wallet } from "lucide-react";

export default function AuthLayout({ children, eyebrow = "" }) {
  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[minmax(320px,.85fr)_1.15fr]">
      <aside className="hidden flex-col justify-between bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 p-10 text-white lg:flex">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25"><Wallet size={20} aria-hidden="true" /></span>
          PocketWise
        </div>
        <div>
          <p className="mb-3 text-sm font-medium uppercase tracking-[.2em] text-indigo-100">Your money, your clarity</p>
          <p className="max-w-sm text-3xl font-semibold leading-tight">Build better money habits, one clear choice at a time.</p>
        </div>
        <p className="text-sm text-indigo-100">© {new Date().getFullYear()} PocketWise. All rights reserved.</p>
      </aside>
      <main className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">{children}<p className="mt-6 text-center text-xs text-slate-500">{eyebrow}</p></div>
      </main>
    </div>
  );
}
