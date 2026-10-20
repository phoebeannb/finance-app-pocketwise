import express from "express";
import mongoose from "mongoose";
import Category from "../models/Category.js";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import Recurring from "../models/Recurring.js";
import Rule from "../models/Rule.js";
import auth from "../middleware/auth.js";

const router = express.Router();
router.use(auth);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const exactI = (s) => new RegExp(`^${escapeRegex(s)}$`, "i");
const clean = (s) => String(s || "").trim().replace(/\s+/g, " ");
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

// How many transactions, budgets and bills use each category
async function usageOf(userId) {
  const uid = new mongoose.Types.ObjectId(userId);
  const lower = { $toLower: { $trim: { input: { $ifNull: ["$category", ""] } } } };
  const [tx, bud, rec] = await Promise.all([
    Transaction.aggregate([{ $match: { user: uid } }, { $group: { _id: { type: "$type", c: lower }, n: { $sum: 1 } } }]),
    Budget.aggregate([{ $match: { user: uid } }, { $group: { _id: lower, n: { $sum: 1 } } }]),
    Recurring.aggregate([{ $match: { user: uid } }, { $group: { _id: { type: "$type", c: lower }, n: { $sum: 1 } } }]),
  ]);
  const sum = (rows, test) => rows.filter(test).reduce((s, r) => s + r.n, 0);
  return (c) => ({
    transactions: sum(tx, (r) => r._id.type === c.type && r._id.c.toLowerCase() === c.key),
    budgets: c.type === "expense" ? sum(bud, (r) => r._id.toLowerCase() === c.key) : 0,
    recurring: sum(rec, (r) => r._id.type === c.type && r._id.c.toLowerCase() === c.key),
  });
}

router.get("/", async (req, res) => {
  const cats = await Category.find({ user: req.userId }).sort({ createdAt: 1 }).lean();
  if (!req.query.usage) return res.json(cats);
  const uses = await usageOf(req.userId);
  res.json(cats.map((c) => ({ ...c, uses: uses(c) })));
});

router.post("/", async (req, res) => {
  try {
    const name = clean(req.body.name);
    const type = req.body.type;
    if (!name) return res.status(400).json({ message: "Enter a category name" });
    if (!["expense", "income"].includes(type)) return res.status(400).json({ message: "Invalid category type" });

    const category = await Category.create({ user: req.userId, name, key: name.toLowerCase(), type });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "That category already exists" });
    res.status(400).json({ message: err.message });
  }
});

// Rename. Past transactions, budgets, bills and import rules are updated to match.
router.put("/:id", async (req, res) => {
  try {
    const cat = await Category.findOne({ _id: req.params.id, user: req.userId });
    if (!cat) return res.status(404).json({ message: "Not found" });

    const name = clean(req.body.name);
    if (!name) return res.status(400).json({ message: "Enter a category name" });
    if (name.length > 30) return res.status(400).json({ message: "Keep it under 30 characters" });
    const key = name.toLowerCase();

    if (key !== cat.key) {
      if (await Category.exists({ user: req.userId, type: cat.type, key, _id: { $ne: cat._id } }))
        return res.status(400).json({ message: "That category already exists" });
      if (cat.type === "expense" && (await Budget.exists({ user: req.userId, category: exactI(name) })))
        return res.status(400).json({ message: `You already have a budget for “${name}”. Delete it first or pick another name.` });
    }

    const old = exactI(cat.name);
    const type = cat.type;
    cat.name = name;
    cat.key = key;
    await cat.save();

    await Promise.all([
      Transaction.updateMany({ user: req.userId, type, category: old }, { $set: { category: name } }),
      Recurring.updateMany({ user: req.userId, type, category: old }, { $set: { category: name } }),
      Rule.updateMany({ user: req.userId, type, category: old }, { $set: { category: name } }),
      type === "expense" ? Budget.updateMany({ user: req.userId, category: old }, { $set: { category: name } }) : null,
    ]);
    res.json(cat);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete is blocked while anything still uses the category
router.delete("/:id", async (req, res) => {
  try {
    const cat = await Category.findOne({ _id: req.params.id, user: req.userId });
    if (!cat) return res.status(404).json({ message: "Not found" });

    const u = (await usageOf(req.userId))(cat);
    const parts = [];
    if (u.transactions) parts.push(plural(u.transactions, "transaction"));
    if (u.budgets) parts.push(plural(u.budgets, "budget"));
    if (u.recurring) parts.push(plural(u.recurring, "bill"));
    if (parts.length)
      return res.status(400).json({
        message: `“${cat.name}” is still used by ${parts.join(", ")}. Rename it instead, or move those to another category first.`,
      });

    await cat.deleteOne();
    await Rule.deleteMany({ user: req.userId, type: cat.type, category: exactI(cat.name) });
    res.json({ message: "Deleted" });
  } catch {
    res.status(404).json({ message: "Not found" });
  }
});

export default router;