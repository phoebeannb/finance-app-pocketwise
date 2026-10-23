import express from "express";
import mongoose from "mongoose";
import Budget from "../models/Budget.js";
import Transaction from "../models/Transaction.js";
import Category from "../models/Category.js";
import auth from "../middleware/auth.js";
import { startOfThisMonth } from "../utils/dates.js";
import { archiveDeleted } from "../utils/deletedItems.js";

const router = express.Router();
router.use(auth);

// Each budget comes back with how much was spent on it this month
router.get("/", async (req, res) => {
  const m = /^(\d{4})-(\d{2})$/.exec(req.query.month || "");
  let from, to;
  if (m) {
    from = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1));
    to = new Date(Date.UTC(Number(m[1]), Number(m[2]), 1));
  } else {
    from = startOfThisMonth();
    to = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1));
  }

  const budgets = await Budget.find({ user: req.userId }).sort({ createdAt: 1 }).lean();
  const categories = await Category.find({ user: req.userId }).select("name parent").lean();
  const parentByKey = Object.fromEntries(categories.filter((c) => c.parent).map((c) => [c.name.toLowerCase(), c.parent]));
  const spent = await Transaction.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(req.userId), type: "expense", date: { $gte: from, $lt: to } } },
    { $project: { parts: { $cond: [{ $gt: [{ $size: { $ifNull: ["$splits", []] } }, 0] }, "$splits", [{ category: "$category", amount: "$amount" }] ] } } },
    { $unwind: "$parts" },
    { $group: { _id: { $toLower: { $trim: { input: "$parts.category" } } }, total: { $sum: "$parts.amount" } } },
  ]);
  const map = Object.fromEntries(spent.map((s) => [s._id, s.total]));
  const rolled = Object.entries(map).reduce((out, [key, total]) => {
    const parent = parentByKey[key]?.toLowerCase() || key;
    out[parent] = (out[parent] || 0) + total;
    return out;
  }, {});
  res.json(budgets.map((b) => ({ ...b, spent: rolled[b.category.toLowerCase()] || 0 })));
});

router.post("/", async (req, res) => {
  try {
    const budget = await Budget.create({
      user: req.userId,
      category: req.body.category,
      limit: Number(req.body.limit),
    });
    res.status(201).json(budget);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "You already have a budget for that category" });
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const budget = await Budget.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { limit: Number(req.body.limit) },
      { new: true, runValidators: true }
    );
    if (!budget) return res.status(404).json({ message: "Not found" });
    res.json(budget);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const budget = await Budget.findOne({ _id: req.params.id, user: req.userId });
  if (!budget) return res.status(404).json({ message: "Not found" });
  await archiveDeleted(req.userId, "budget", budget);
  await budget.deleteOne();
  res.json({ message: "Deleted" });
});

export default router;