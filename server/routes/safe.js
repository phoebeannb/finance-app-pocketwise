import express from "express";
import mongoose from "mongoose";
import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";
import Recurring from "../models/Recurring.js";
import Goal from "../models/Goal.js";
import auth from "../middleware/auth.js";
import { startOfToday, addDays } from "../utils/dates.js";
import { nextOccurrence } from "../utils/recurring.js";

const router = express.Router();
router.use(auth);

const SPENDABLE = ["Bank Account", "Other"];
const r2 = (n) => Math.round(n * 100) / 100;

/*
  Safe to spend today =
    (money in your bank accounts + income still expected this month − bills still due this month)
    ÷ days left in the month, minus what you've already spent today.
  Expected income is counted after the share that goes to savings goals.
*/
router.get("/", async (req, res) => {
  try {
    const today = startOfToday();
    const tomorrow = addDays(today, 1);
    const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
    const daysLeft = Math.round((monthEnd - today) / 86400000) + 1;

    const accounts = await Account.find({ user: req.userId, type: { $in: SPENDABLE } }).lean();
    if (accounts.length === 0) return res.json({ hasAccounts: false });

    const ids = accounts.map((a) => a._id);
    const idSet = new Set(ids.map(String));
    const mine = (x) => x && idSet.has(String(x));

    const txs = await Transaction.find({
      user: req.userId,
      $or: [{ account: { $in: ids } }, { toAccount: { $in: ids } }],
    }).select("type amount fee account toAccount date").lean();

    let balance = accounts.reduce((s, a) => s + a.balance, 0);
    let spentOnAccounts = 0; // spent today from these accounts
    for (const t of txs) {
      if (t.type === "income" && mine(t.account)) balance += t.amount;
      else if (t.type === "expense" && mine(t.account)) {
        balance -= t.amount;
        if (t.date >= today && t.date < tomorrow) spentOnAccounts += t.amount;
      } else if (t.type === "transfer") {
        if (mine(t.account)) balance -= t.amount + (t.fee || 0);
        if (mine(t.toAccount)) balance += t.amount;
      }
    }

    // Spending captured today that isn't tied to an account yet still counts against today
    const unfiled = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.userId), type: "expense", account: null, date: { $gte: today, $lt: tomorrow } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const unfiledToday = unfiled[0]?.total || 0;

    const goals = await Goal.find({ user: req.userId, autoPercent: { $gt: 0 } }).select("autoPercent saved target").lean();
    const share = Math.min(1, goals.filter((g) => g.saved < g.target).reduce((s, g) => s + g.autoPercent, 0) / 100);

    const items = await Recurring.find({ user: req.userId, active: true, nextDate: { $lte: monthEnd } }).lean();
    let bills = 0;
    let income = 0;
    let billCount = 0;
    for (const it of items) {
      let d = it.nextDate;
      for (let i = 0; i < 10 && d.getTime() <= monthEnd.getTime(); i++) {
        if (it.type === "expense") bills += it.amount;
        else if (mine(it.account)) income += it.amount * (1 - share);
        d = nextOccurrence(d, it.cadence, it.anchorDay);
      }
      if (it.type === "expense") billCount++;
    }

    const startOfDay = balance + spentOnAccounts; // what you had before today's spending
    const perDay = (startOfDay + income - bills) / daysLeft;
    const safeToday = perDay - spentOnAccounts - unfiledToday;

    res.json({
      hasAccounts: true,
      balance: r2(balance),
      income: r2(income),
      bills: r2(bills),
      billCount,
      left: r2(balance + income - bills),
      daysLeft,
      perDay: r2(perDay),
      spentToday: r2(spentOnAccounts + unfiledToday),
      safeToday: r2(safeToday),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;