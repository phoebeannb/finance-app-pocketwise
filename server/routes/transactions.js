import express from "express";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";
import Goal from "../models/Goal.js";
import auth from "../middleware/auth.js";
import { startOfToday, startOfThisMonth, addDays } from "../utils/dates.js";

const router = express.Router();
router.use(auth);

const TYPES = ["income", "expense", "transfer"];
const isId = (v) => mongoose.isValidObjectId(v);
const r2 = (n) => Math.round(n * 100) / 100;

async function buildPayload(body, userId) {
  const type = body.type;
  const amount = Number(body.amount);
  if (!TYPES.includes(type)) return { error: "Invalid transaction type" };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be greater than 0" };

  const date = body.date ? new Date(body.date) : new Date();
  if (Number.isNaN(date.getTime())) return { error: "Invalid date" };

  const accountId = body.account || null;
  const toId = type === "transfer" ? body.toAccount || null : null;

  let fee = 0;
  if (type === "transfer" && body.fee !== undefined && body.fee !== null && body.fee !== "") {
    fee = Number(body.fee);
    if (!Number.isFinite(fee) || fee < 0) return { error: "Transfer fee must be 0 or more" };
  }

  const data = {
    type,
    amount: r2(amount),
    fee: r2(fee),
    date,
    description: (body.description || "").toString().trim().slice(0, 200),
    category: type === "transfer" ? "Transfer" : (body.category || "").toString().trim().slice(0, 60),
    account: accountId,
    toAccount: toId,
  };

  if (type === "transfer") {
    if (!accountId || !toId) return { error: "Choose both accounts for a transfer" };
    if (String(accountId) === String(toId)) return { error: "Pick two different accounts" };
  }

  const ids = [accountId, toId].filter(Boolean);
  if (ids.some((id) => !isId(id))) return { error: "Invalid account" };
  if (ids.length) {
    const found = await Account.countDocuments({ _id: { $in: ids }, user: userId });
    if (found !== new Set(ids.map(String)).size) return { error: "Account not found" };
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

// Overview summary. Transfers are not income or expense, but transfer FEES are expenses.
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
  const feeTotal = fees[0]?.total || 0;
  if (feeTotal > 0) byCategory.push({ _id: "Transfer Fees", total: r2(feeTotal) });

  const income = byType.find((t) => t._id === "income")?.total || 0;
  const expenses = r2((byType.find((t) => t._id === "expense")?.total || 0) + feeTotal);
  res.json({ income, expenses, balance: r2(income - expenses), byCategory });
});

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const YMD = /^\d{4}-\d{2}-\d{2}$/;

router.get("/search", async (req, res) => {
  try {
    const { q, type, category, account, from, to, min, max } = req.query;
    const and = [{ user: new mongoose.Types.ObjectId(req.userId) }];

    if (TYPES.includes(type)) and.push({ type });
    if (category) and.push({ category: new RegExp(`^${escapeRegex(String(category).slice(0, 60))}$`, "i") });
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

router.post("/", async (req, res) => {
  try {
    const { error, data } = await buildPayload(req.body, req.userId);
    if (error) return res.status(400).json({ message: error });
    const tx = await Transaction.create({ ...data, user: req.userId });
    res.status(201).json(tx);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const existing = await Transaction.findOne({ _id: req.params.id, user: req.userId });
    if (!existing) return res.status(404).json({ message: "Not found" });
    if (existing.goal)
      return res.status(400).json({ message: "Savings entries can't be edited. Delete it and add it again." });

    const { error, data } = await buildPayload(req.body, req.userId);
    if (error) return res.status(400).json({ message: error });
    const tx = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      data,
      { new: true, runValidators: true }
    );
    res.json(tx);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const tx = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!tx) return res.status(404).json({ message: "Not found" });

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
    res.status(404).json({ message: "Not found" });
  }
});

export default router;