const pad = (n) => String(n).padStart(2, "0");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const DATE_FORMATS = [
  ["medium", "Oct 20, 2026"],
  ["dmy", "20/10/2026"],
  ["mdy", "10/20/2026"],
  ["iso", "2026-10-20"],
];

let dateFormat = "medium";
export const setDateFormat = (f) => {
  dateFormat = DATE_FORMATS.some(([k]) => k === f) ? f : "medium";
};

// Times are stored exactly as written, so they're always read as UTC
function dateText(d, style) {
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const day = d.getUTCDate();
  if (style === "dmy") return `${pad(day)}/${pad(m + 1)}/${y}`;
  if (style === "mdy") return `${pad(m + 1)}/${pad(day)}/${y}`;
  if (style === "iso") return `${y}-${pad(m + 1)}-${pad(day)}`;
  return `${MONTHS[m]} ${day}, ${y}`;
}

function timeText(d) {
  const h = d.getUTCHours();
  return `${h % 12 || 12}:${pad(d.getUTCMinutes())} ${h >= 12 ? "PM" : "AM"}`;
}

export const formatDateWith = (style, iso) => dateText(new Date(iso), style);
export const fmtDate = (iso) => dateText(new Date(iso), dateFormat);
export const fmtDateTime = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  if (d.getUTCHours() === 0 && d.getUTCMinutes() === 0) return dateText(d, dateFormat);
  return `${dateText(d, dateFormat)}, ${timeText(d)}`;
};

// Current date and time for a <input type="datetime-local">
export const nowLocalInput = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const toStored = (inputValue) => `${inputValue}:00.000Z`;
export const toInput = (iso) => iso.slice(0, 16);