const pad = (n) => String(n).padStart(2, "0");

// Current date and time for a <input type="datetime-local">
export const nowLocalInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const toStored = (inputValue) => `${inputValue}:00.000Z`;
export const toInput = (iso) => iso.slice(0, 16);

export const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-PH", { timeZone: "UTC", year: "numeric", month: "short", day: "numeric" });

export const fmtDateTime = (iso) => {
  const d = new Date(iso);
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return fmtDate(iso);
  return d.toLocaleString("en-PH", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" });
};