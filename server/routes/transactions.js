import express from "express";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";
import Goal from "../models/Goal.js";
import Rule from "../models/Rule.js";
import auth from "../middleware/auth.js";
import { startOfToday, startOfThisMonth, addDays } from "../utils/dates.js";
import { applyAutoSave, reverseAutoSave } from "../utils/autosave.js";
import { prepareRules, suggestCategory } from "../utils/autoCategory.js";
import { MOOD_KEYS } from "../utils/moods.js";

const router = express.Router();
router.use(auth);

const TYPES = ["income", "expense", "transfer"];
const isId = (v) => mongoose.isValidObjectId(v);
const r2 = (n) => Math.round(n * 100) / 100;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const UNSORTED = [{ category: "" }, { category: null }]; // no category yet = waiting in the inbox
const withAuto = (tx, autoSaved) => ({ ...tx.toObject(), autoSaved });

async function buildPayload(body, userId) {
  const type = body.type;
  const amount = Number(body.amount);
  if (!TYPES.includes(type)) return { error: "Choose Income, Expense or Transfer" };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter an amount greater than 0" };

  const date = body.date ? new Date(body.date) : new Date();
  if (Number.isNaN(date.getTime())) return { error: "Enter a valid date" };

  const accountId = body.account || null;
  const toId = type === "transfer" ? body.toAccount || null : null;

  let fee = 0;
  if (type === "transfer" && body.fee !== undefined && body.fee !== null && body.fee !== "") {
    fee = Number(body.fee);
    if (!Number.isFinite(fee) || fee < 0) return { error: "The transfer fee must be 0 or more" };
  }

  const data = {
    type,
    amount: r2(amount),
    fee: r2(fee),
    date,
    description: (body.description || "").toString().trim().slice(0, 200),
    category: type === "transfer" ? "Transfer" : (body.category || "").toString().trim().slice(0, 60),
    mood: type !== "transfer" && MOOD_KEYS.includes(body.mood) ? body.mood : "",
    account: accountId,
    toAccount: toId,
  };

  if (type === "transfer") {
    if (!accountId || !toId) return { error: "Choose both the account to take from and the account to send to" };
    if (String(accountId) === String(toId)) return { error: "Pick two different accounts" };
  }

  const ids = [accountId, toId].filter(Boolean);
  if (ids.some((id) => !isId(id))) return { error: "That account isn't valid. Choose one from the list" };
  if (ids.length) {
    const found = await Account.countDocuments({ _id: { $in: ids }, user: userId });
    if (found !== new Set(ids.map(String)).size) return { error: "That account wasn't found. It may have been deleted" };
  }

  return { data };
}

router.get("/", async (req, res) => {
  const filter = { user: req.userId };
  if (TYPES.includes(req.query.type)) filter.type = req.query.type;
  const items = await Transaction.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .limit(Number(req.query.limit) || 0)
    .populate("account", "name type")
    .populate("toAccount", "name type");
  res.json(items);
});

// The inbox: income and expenses that still have no category, each with a suggested one
router.get("/inbox", async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 5));
    const base = { user: new mongoose.Types.ObjectId(req.userId), type: { $in: ["income", "expense"] }, $or: UNSORTED };
    const today = startOfToday();
    const [count, yesterday, docs, ruleDocs] = await Promise.all([
      Transaction.countDocuments(base),
      Transaction.countDocuments({ ...base, date: { $gte: addDays(today, -1), $lt: today } }),
      Transaction.find(base).sort({ date: -1, createdAt: -1 }).limit(limit).populate("account", "name type"),
      Rule.find({ user: req.userId }).lean(),
    ]);
    const rules = prepareRules(ruleDocs);
    res.json({
      count,
      yesterday,
      items: docs.map((d) => ({ ...d.toObject(), suggestion: suggestCategory(d.description, d.type, rules).category })),
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/search", async (req, res) => {
  try {
    const { q, type, category, account, from, to, min, max } = req.query;
    const and = [{ user: new mongoose.Types.ObjectId(req.userId) }];

    if (TYPES.includes(type)) and.push({ type });
    if (category) and.push({ category: new RegExp(`^${escapeRegex(String(category).slice(0, 60))}$`, "i") });
    if (req.query.uncategorized === "1") {
      and.push({ type: { $in: ["income", "expense"] } });
      and.push({ $or: UNSORTED });
    }
    if (isId(account)) {
      const a = new mongoose.Types.ObjectId(account);
      and.push({ $or: [{ account: a }, { toAccount: a }] });
    }
    const text = String(q || "").trim().slice(0, 60);
    if (text) {
      const rx = new RegExp(escapeRegex(text), "i");
      and.push({ $or: [{ description: rx }, { category: rx }] });
    }
    if (YMD.test(from || "")) and.push({ date: { $gte: new Date(`${from}T00:00:00.000Z`) } });
    if (YMD.test(to || "")) and.push({ date: { $lt: new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 86400000) } });
    if (min !== undefined && min !== "" && Number.isFinite(Number(min))) and.push({ amount: { $gte: Number(min) } });
    if (max !== undefined && max !== "" && Number.isFinite(Number(max))) and.push({ amount: { $lte: Number(max) } });

    const match = { $and: and };
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const total = await Transaction.countDocuments(match);
    const pages = Math.ceil(total / pageSize);
    const page = Math.min(Math.max(1, parseInt(req.query.page, 10) || 1), Math.max(1, pages));

    const items = await Transaction.find(match)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("account", "name type")
      .populate("toAccount", "name type");

    const sums = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);
    const totals = {
      income: r2(sums.find((s) => s._id === "income")?.total || 0),
      expenses: r2(sums.find((s) => s._id === "expense")?.total || 0), // transfers aren't counted
    };

    res.json({ items, total, page, pageSize, pages, totals });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Overview numbers. Transfers aren't income or expense, but transfer FEES are expenses.
// "saved" is the money moved into (or out of) savings goals in the same period.
router.get("/summary", async (req, res) => {
  const match = { user: new mongoose.Types.ObjectId(req.userId) };
  const m = /^(\d{4})-(\d{2})$/.exec(req.query.month || "");
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    match.date = { $gte: new Date(Date.UTC(y, mo, 1)), $lt: new Date(Date.UTC(y, mo + 1, 1)) };
  } else if (req.query.period === "week") match.date = { $gte: addDays(startOfToday(), -6) };
  else if (req.query.period === "month") match.date = { $gte: startOfThisMonth() };

  const byType = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: "$type", total: { $sum: "$amount" } } },
  ]);
  const byCategory = await Transaction.aggregate([
    { $match: { ...match, type: "expense" } },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
  ]);
  const fees = await Transaction.aggregate([
    { $match: { ...match, type: "transfer", fee: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: "$fee" } } },
  ]);
  const goalMoves = await Transaction.aggregate([
    { $match: { ...match, type: "transfer", goal: { $ne: null } } },
    { $group: { _id: { $cond: [{ $ne: ["$account", null] }, "in", "out"] }, total: { $sum: "$amount" } } },
  ]);

  const feeTotal = fees[0]?.total || 0;
  if (feeTotal > 0) byCategory.push({ _id: "Transfer Fees", total: r2(feeTotal) });

  const income = byType.find((t) => t._id === "income")?.total || 0;
  const expenses = r2((byType.find((t) => t._id === "expense")?.total || 0) + feeTotal);
  const saved = r2((goalMoves.find((g) => g._id === "in")?.total || 0) - (goalMoves.find((g) => g._id === "out")?.total || 0));
  res.json({ income, expenses, balance: r2(income - expenses), saved, byCategory });
});

router.post("/", async (req, res) => {
  try {
    const { error, data } = await buildPayload(req.body, req.userId);
    if (error) return res.status(400).json({ message: error });
    const tx = await Transaction.create({ ...data, user: req.userId });
    const autoSaved = tx.type === "income" ? await applyAutoSave(tx) : 0;
    res.status(201).json(withAuto(tx, autoSaved));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const existing = await Transaction.findOne({ _id: req.params.id, user: req.userId });
    if (!existing) return res.status(404).json({ message: "That transaction wasn't found" });
    if (existing.goal)
      return res.status(400).json({ message: "Savings entries can't be edited. Delete it and add it again." });

    const { error, data } = await buildPayload(req.body, req.userId);
    if (error) return res.status(400).json({ message: error });

    const tx = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      data,
      { new: true, runValidators: true }
    );
    // The income may have changed (amount, account or type), so redo its automatic savings
    await reverseAutoSave(req.userId, tx._id);
    const autoSaved = tx.type === "income" ? await applyAutoSave(tx) : 0;
    res.json(withAuto(tx, autoSaved));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const tx = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!tx) return res.status(404).json({ message: "That transaction wasn't found" });

    if (tx.type === "income") await reverseAutoSave(req.userId, tx._id);

    // Deleting a savings entry also reverses it on the goal
    if (tx.goal) {
      const goal = await Goal.findOne({ _id: tx.goal, user: req.userId });
      if (goal) {
        const change = tx.account ? -tx.amount : tx.amount; // deposit → remove, withdrawal → put back
        goal.saved = Math.max(0, r2(goal.saved + change));
        await goal.save();
      }
    }
    res.json({ message: "Deleted" });
  } catch {
    res.status(404).json({ message: "That transaction wasn't found" });
  }
});

export default router;