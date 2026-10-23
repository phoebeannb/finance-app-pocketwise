import express from "express";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Recurring from "../models/Recurring.js";
import auth from "../middleware/auth.js";
import { startOfToday, addDays } from "../utils/dates.js";

const router = express.Router();
router.use(auth);

const r2 = (n) => Math.round(n * 100) / 100;
const DAY = 86400000;

async function totals(uid, from, to) {
  const range = { $gte: from, $lt: to };
  const [rows, fees] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: uid, type: { $in: ["income", "expense"] }, date: range } },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]),
    Transaction.aggregate([
      { $match: { user: uid, type: "transfer", fee: { $gt: 0 }, date: range } },
      { $group: { _id: null, total: { $sum: "$fee" } } },
    ]),
  ]);
  return {
    income: r2(rows.find((r) => r._id === "income")?.total || 0),
    expenses: r2((rows.find((r) => r._id === "expense")?.total || 0) + (fees[0]?.total || 0)),
  };
}

const categoryTotals = async (uid, from, to) => {
  const txs = await Transaction.find({ user: uid, type: "expense", date: { $gte: from, $lt: to } })
    .select("category amount splits").lean();
  const totals = {};
  for (const tx of txs) {
    const parts = tx.splits?.length ? tx.splits : [{ category: tx.category, amount: tx.amount }];
    for (const part of parts) totals[part.category || ""] = (totals[part.category || ""] || 0) + part.amount;
  }
  return Object.entries(totals).sort((a, b) => b[1] - a[1]).map(([category, total]) => ({ _id: category, total }));
};

/*
  For the current month, "last month" means the same number of days (so day 10 is compared with last month's first 10 days).
  For a past month it means the whole month before it.
*/
router.get("/", async (req, res) => {
  try {
    const uid = new mongoose.Types.ObjectId(req.userId);
    const today = startOfToday();
    const m = /^(\d{4})-(\d{2})$/.exec(req.query.month || "");
    const y = m ? Number(m[1]) : today.getUTCFullYear();
    const mo = m ? Number(m[2]) - 1 : today.getUTCMonth();
    const isCurrent = y === today.getUTCFullYear() && mo === today.getUTCMonth();

    const curFrom = new Date(Date.UTC(y, mo, 1));
    const prevFrom = new Date(Date.UTC(y, mo - 1, 1));
    const prevEnd = new Date(Date.UTC(y, mo, 1));
    let curTo = new Date(Date.UTC(y, mo + 1, 1));
    let prevTo = prevEnd;
    if (isCurrent) {
      curTo = addDays(today, 1);
      prevTo = new Date(Math.min(prevFrom.getTime() + today.getUTCDate() * DAY, prevEnd.getTime()));
    }

    const [now, before, cats, prevCats] = await Promise.all([
      totals(uid, curFrom, curTo),
      totals(uid, prevFrom, prevTo),
      categoryTotals(uid, curFrom, curTo),
      categoryTotals(uid, prevFrom, prevTo),
    ]);

    const spent = cats.reduce((s, c) => s + c.total, 0);
    const topRow = cats.find((c) => c._id);
    const top = topRow
      ? {
          name: topRow._id,
          total: r2(topRow.total),
          share: spent ? Math.round((topRow.total / spent) * 100) : 0,
          prev: r2(prevCats.find((c) => c._id === topRow._id)?.total || 0),
        }
      : null;

    // Month-end forecast: your usual day-to-day spending (not counting bills) carried to the end of the month
    let forecast = null;
    if (isCurrent) {
      const daysInMonth = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
      const daysElapsed = today.getUTCDate();
      const variable = await Transaction.aggregate([
        { $match: { user: uid, type: "expense", recurring: null, date: { $gte: curFrom, $lt: curTo } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]);
      const variableSoFar = variable[0]?.total || 0;
      const variableDaily = variableSoFar / daysElapsed;
      const daysLeft = daysInMonth - daysElapsed;
      forecast = {
        variableSoFar: r2(variableSoFar),
        variableDaily: r2(variableDaily),
        daysElapsed,
        daysLeft,
        projectedVariable: r2(variableDaily * daysLeft),
        early: daysElapsed < 5,
      };
    }

    const dueCandidates = await Recurring.find({
      user: uid, active: true, type: "expense", nextDate: { $lte: addDays(today, 30) },
    }).sort({ nextDate: 1 }).lean();
    const due = dueCandidates.filter((item) => item.nextDate.getTime() <= addDays(today, item.reminderDays ?? 3).getTime());
    const billsDue = {
      total: r2(due.reduce((s, i) => s + i.amount, 0)),
      items: due.map(({ _id, name, amount, nextDate, category, valueRating, reminderDays }) => ({ _id, name, amount, nextDate, category, valueRating, reminderDays })),
    };

    res.json({ compare: isCurrent ? "pace" : "full", now, before, top, forecast, billsDue });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;