export default function AuthLayout({ children, eyebrow = "" }) {
  return (
    <div className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-[minmax(300px,.8fr)_1.2fr]">
      <aside className="relative hidden overflow-hidden bg-indigo-700 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-80 w-80 rounded-full border-[40px] border-white/10" aria-hidden="true" />
        <div className="absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-indigo-600" aria-hidden="true" />
        <div className="relative flex items-center gap-3 text-lg font-semibold">
          <span>PocketWise</span>
        </div>
        <div className="relative">
          <p className="mb-3 text-sm font-medium uppercase tracking-[.2em] text-indigo-100">Your money, your clarity</p>
          <p className="max-w-sm text-3xl font-semibold leading-tight">Build better money habits,<br />one clear choice at a time.</p>
        </div>
        <p className="relative text-sm text-indigo-100">© {new Date().getFullYear()} PocketWise. All rights reserved.</p>
      </aside>
      <main className="flex min-h-screen items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-[430px]">
          <div className="mb-8 flex items-center gap-2 text-lg font-semibold text-slate-900 lg:hidden">
            PocketWise
          </div>
          {children}
          <p className="mt-6 text-center text-xs text-slate-500">{eyebrow}</p>
        </div>
      </main>
    </div>
  );
}
