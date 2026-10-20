export const inputClass =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
export const primaryBtn =
  "rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
export const secondaryBtn =
  "rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";

export function Block({ title, description, children }) {
  return (
    <section className="pt-8 first:pt-0">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      <div className="mt-3 border-t border-slate-200">{children}</div>
    </section>
  );
}

export function Row({ label, hint, children }) {
  return (
    <div className="grid gap-2 border-b border-slate-200 py-4 md:grid-cols-[220px_minmax(0,1fr)] md:gap-8">
      <div>
        <div className="text-sm font-medium text-slate-900">{label}</div>
        {hint && <p className="mt-0.5 text-sm text-slate-500">{hint}</p>}
      </div>
      <div className="max-w-md">{children}</div>
    </div>
  );
}

export function Actions({ children }) {
  return <div className="flex justify-end gap-2 pt-4">{children}</div>;
}