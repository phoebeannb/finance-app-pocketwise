import express from "express";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";
import auth from "../middleware/auth.js";
import { startOfToday, startOfThisMonth, addDays } from "../utils/dates.js";

const router = express.Router();
router.use(auth);

const TYPES = ["income", "expense", "transfer"];
const isId = (v) => mongoose.isValidObjectId(v);

// Builds a clean transaction object from the request body, or returns { error }
async function buildPayload(body, userId) {
  const type = body.type;
  const amount = Number(body.amount);
  if (!TYPES.includes(type)) return { error: "Invalid transaction type" };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be greater than 0" };

  const date = body.date ? new Date(body.date) : new Date();
  if (Number.isNaN(date.getTime())) return { error: "Invalid date" };

  const accountId = body.account || null;
  const toId = type === "transfer" ? body.toAccount || null : null;

  const data = {
    type,
    amount,
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

  // Accounts must exist and belong to this user
  const ids = [accountId, toId].filter(Boolean);
  if (ids.some((id) => !isId(id))) return { error: "Invalid account" };
  if (ids.length) {
    const found = await Account.countDocuments({ _id: { $in: ids }, user: userId });
    if (found !== new Set(ids.map(String)).size) return { error: "Account not found" };
  }

  return { data };
}

// List (optional ?type= and ?limit=)
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

// Summary for the overview cards (transfers are never counted as income or expense)
router.get("/summary", async (req, res) => {
  const match = { user: new mongoose.Types.ObjectId(req.userId) };
  if (req.query.period === "week") match.date = { $gte: addDays(startOfToday(), -6) };
  else if (req.query.period === "month") match.date = { $gte: startOfThisMonth() };

  const byType = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: "$type", total: { $sum: "$amount" } } },
  ]);
  const byCategory = await Transaction.aggregate([
    { $match: { ...match, type: "expense" } },
    { $group: { _id: "$category", total: { $sum: "$amount" } } },
  ]);
  const income = byType.find((t) => t._id === "income")?.total || 0;
  const expenses = byType.find((t) => t._id === "expense")?.total || 0;
  res.json({ income, expenses, balance: income - expenses, byCategory });
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
    const { error, data } = await buildPayload(req.body, req.userId);
    if (error) return res.status(400).json({ message: error });
    const tx = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      data,
      { new: true, runValidators: true }
    );
    if (!tx) return res.status(404).json({ message: "Not found" });
    res.json(tx);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const tx = await Transaction.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!tx) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Deleted" });
});

export default router;