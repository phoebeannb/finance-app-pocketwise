const pad = (n) => String(n).padStart(2, "0");

const qs = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => { if (v) p.set(k, v); });
  const s = p.toString();
  return s ? `?${s}` : "";
};

// "2026-10" → October 1 to 31, "2026" → the whole year
export function periodRange(key) {
  const m = /^(\d{4})-(\d{2})$/.exec(key || "");
  if (m) {
    const last = new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate();
    return { from: `${m[1]}-${m[2]}-01`, to: `${m[1]}-${m[2]}-${pad(last)}` };
  }
  if (/^\d{4}$/.test(key || "")) return { from: `${key}-01-01`, to: `${key}-12-31` };
  return {};
}

export const monthLink = (key) => `/transactions${qs(periodRange(key))}`;

export const periodLink = (key, metric) =>
  `/transactions${qs({ ...periodRange(key), type: metric === "income" ? "income" : metric === "expenses" ? "expense" : "" })}`;

export function categoryLink(name, month) {
  if (name === "Uncategorized") return "/transactions?inbox=1";
  if (name === "Transfer Fees") return `/transactions${qs({ type: "transfer", ...(month ? periodRange(month) : {}) })}`;
  return `/transactions${qs({ category: name, type: "expense", ...(month ? periodRange(month) : {}) })}`;
}