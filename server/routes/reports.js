import express from "express";
import Transaction from "../models/Transaction.js";
import auth from "../middleware/auth.js";
import { startOfToday, addDays } from "../utils/dates.js";
import { largestRemainder } from "../utils/percent.js";

const router = express.Router();
router.use(auth);

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const r2 = (n) => Math.round(n * 100) / 100;

function buildBuckets(period) {
  const today = startOfToday();
  const buckets = [];

  if (period === "daily") {
    for (let i = 29; i >= 0; i--) {
      const d = addDays(today, -i);
      buckets.push({ key: ymd(d), label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`, start: d });
    }
  } else if (period === "weekly") {
    const monday = addDays(today, -((today.getUTCDay() + 6) % 7));
    for (let i = 11; i >= 0; i--) {
      const d = addDays(monday, -7 * i);
      buckets.push({ key: ymd(d), label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`, start: d });
    }
  } else if (period === "yearly") {
    const y = today.getUTCFullYear();
    for (let i = 4; i >= 0; i--) {
      buckets.push({ key: String(y - i), label: String(y - i), start: new Date(Date.UTC(y - i, 0, 1)) });
    }
  } else {
    const y = today.getUTCFullYear();
    const m = today.getUTCMonth();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(y, m - i, 1));
      buckets.push({
        key: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`,
        label: `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`,
        start: d,
      });
    }
  }
  return buckets;
}

function keyFor(period, date) {
  if (period === "daily") return ymd(date);
  if (period === "weekly") {
    const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    return ymd(addDays(d, -((d.getUTCDay() + 6) % 7)));
  }
  if (period === "yearly") return String(date.getUTCFullYear());
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

async function run(userId, period) {
  const buckets = buildBuckets(period);
  const txs = await Transaction.find({
    user: userId,
    date: { $gte: buckets[0].start },
    // income and expenses, plus transfers that carried a fee (the fee is an expense)
    $or: [{ type: { $in: ["income", "expense"] } }, { type: "transfer", fee: { $gt: 0 } }],
  }).select("type amount fee category date").lean();

  const series = buckets.map((b) => ({ key: b.key, label: b.label, income: 0, expenses: 0, savings: 0 }));
  const index = Object.fromEntries(series.map((s, i) => [s.key, i]));
  const cats = {};

  for (const t of txs) {
    const i = index[keyFor(period, t.date)];
    if (i === undefined) continue;
    if (t.type === "income") {
      series[i].income += t.amount;
    } else if (t.type === "expense") {
      series[i].expenses += t.amount;
      const c = t.category?.trim() || "Uncategorized";
      cats[c] = (cats[c] || 0) + t.amount;
    } else {
      series[i].expenses += t.fee;
      cats["Transfer Fees"] = (cats["Transfer Fees"] || 0) + t.fee;
    }
  }

  for (const s of series) {
    s.income = r2(s.income);
    s.expenses = r2(s.expenses);
    s.savings = r2(s.income - s.expenses);
  }

    const entries = Object.entries(cats).sort((a, b) => b[1] - a[1]);
    const pcts = largestRemainder(entries.map(([, total]) => total));
    const categories = entries.map(([category, total], i) => ({
    category,
        total: r2(total),
        percent: pcts[i],
  }));

  return { series, categories };
}

router.get("/", async (req, res) => {
  const period = ["daily", "weekly", "monthly", "yearly"].includes(req.query.period)
    ? req.query.period
    : "monthly";

  const main = await run(req.userId, period);
  const monthly = period === "monthly" ? main : await run(req.userId, "monthly");

  const income = r2(main.series.reduce((s, x) => s + x.income, 0));
  const expenses = r2(main.series.reduce((s, x) => s + x.expenses, 0));

  res.json({
    period,
    series: main.series,
    totals: { income, expenses, savings: r2(income - expenses) },
    categories: main.categories,
    monthly: monthly.series,
  });
});

export default router;