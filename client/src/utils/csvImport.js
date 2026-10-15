const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, "0");

const validYmd = (y, m, d) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

// Returns "YYYY-MM-DDTHH:MM:00.000Z" (the same "time as written" format the app uses everywhere) or null
export function parseDateTime(value, fmt = "auto") {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;

  let y, m, d, rest = "", mt;
  if ((mt = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(.*)$/))) {
    y = +mt[1]; m = +mt[2]; d = +mt[3]; rest = mt[4];
  } else if ((mt = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})(.*)$/))) {
    const a = +mt[1], b = +mt[2];
    y = +mt[3]; rest = mt[4];
    if (y < 100) y += 2000;
    if (fmt === "dmy") { d = a; m = b; }
    else if (fmt === "mdy") { m = a; d = b; }
    else if (a > 12) { d = a; m = b; }
    else { m = a; d = b; }
  } else if ((mt = s.match(/^([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})(.*)$/))) {
    m = MONTHS[mt[1].slice(0, 3).toLowerCase()]; d = +mt[2]; y = +mt[3]; rest = mt[4];
  } else if ((mt = s.match(/^(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})(.*)$/))) {
    d = +mt[1]; m = MONTHS[mt[2].slice(0, 3).toLowerCase()]; y = +mt[3]; rest = mt[4];
  } else {
    return null;
  }
  if (!m || !validYmd(y, m, d)) return null;

  let hh = 0, mi = 0;
  const t = rest.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?/);
  if (t) {
    hh = +t[1]; mi = +t[2];
    const ap = t[3]?.toLowerCase();
    if (ap === "pm" && hh < 12) hh += 12;
    if (ap === "am" && hh === 12) hh = 0;
    if (hh > 23 || mi > 59) { hh = 0; mi = 0; }
  }
  return `${y}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mi)}:00.000Z`;
}

// "₱1,234.50", "(250.00)", "-250", "PHP 99" → number (negative if it has a minus or parentheses)
export function parseAmount(value) {
  if (value == null) return NaN;
  let s = String(value).trim();
  if (!s) return NaN;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  s = s.replace(/[−–]/g, "-").replace(/[^0-9.,-]/g, "");
  if (s.includes("-")) neg = true;
  const n = parseFloat(s.replace(/-/g, "").replace(/,/g, ""));
  if (!Number.isFinite(n)) return NaN;
  return neg ? -n : n;
}

// Guess which column is which from the header names
export function detectColumns(headers) {
  const find = (...res) => headers.find((h) => res.some((r) => r.test(h))) || "";
  const debit = find(/debit|withdraw|money out|paid out|outflow/i);
  const credit = find(/credit|deposit|money in|paid in|inflow|received/i);
  const amount =
    headers.find((h) => /^amount$/i.test(h)) ||
    headers.find((h) => /amount|amt/i.test(h) && h !== debit && h !== credit) ||
    "";
  return {
    date: find(/date|posted|time/i),
    description: find(/descri|detail|merchant|narrat|particular|remark|memo|payee/i) || find(/reference|name/i),
    amount: debit || credit ? "" : amount,
    debit,
    credit,
  };
}

// Turn the raw CSV rows into clean rows using the chosen columns
export function buildRows(raw, map, { dateFmt, positiveIsExpense }) {
  const rows = [];
  let unreadable = 0;

  raw.forEach((r, i) => {
    const date = parseDateTime(r[map.date], dateFmt);
    const description = String(r[map.description] ?? "").replace(/\s+/g, " ").trim();
    let type = null;
    let amount = 0;

    if (map.debit || map.credit) {
      const out = Math.abs(parseAmount(map.debit ? r[map.debit] : ""));
      const inn = Math.abs(parseAmount(map.credit ? r[map.credit] : ""));
      if (out > 0) { type = "expense"; amount = out; }
      else if (inn > 0) { type = "income"; amount = inn; }
    } else if (map.amount) {
      const n = parseAmount(r[map.amount]);
      if (Number.isFinite(n) && n !== 0) {
        amount = Math.abs(n);
        type = (n < 0) !== !!positiveIsExpense ? "expense" : "income";
      }
    }

    if (!date || !type || !(amount > 0)) { unreadable++; return; }
    rows.push({ id: i, date, description, amount: Math.round(amount * 100) / 100, type });
  });

  return { rows, unreadable };
}

// The "remember" keyword for a description: its first two meaningful words
const STOP = new Set([
  "payment", "pay", "paid", "to", "from", "transfer", "sent", "send", "received", "cash", "in", "out",
  "pos", "purchase", "online", "debit", "credit", "withdrawal", "deposit", "instapay", "pesonet", "gcash",
  "the", "of", "for", "via", "ref", "no", "mobile", "bank", "atm",
]);

export function deriveKeyword(description) {
  const words = String(description || "")
    .toLowerCase()
    .replace(/[^a-z]+/g, " ")
    .trim()
    .split(" ")
    .filter((w) => w.length > 1 && !STOP.has(w));
  const kw = words.slice(0, 2).join(" ");
  return kw.length >= 3 ? kw : "";
}