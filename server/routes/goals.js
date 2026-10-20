import express from "express";
import mongoose from "mongoose";
import Goal from "../models/Goal.js";
import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";
import auth from "../middleware/auth.js";

const router = express.Router();
router.use(auth);

const LIABILITIES = ["Credit Card", "Loan"];
const r2 = (n) => Math.round(n * 100) / 100;

async function build(body, userId, exceptId) {
  const name = String(body.name || "").trim().slice(0, 60);
  if (!name) return { error: "Give the goal a name" };

  const target = Number(body.target);
  if (!Number.isFinite(target) || target < 1 || target >= 1e12) return { error: "Enter a target amount of at least 1" };

  let deadline = null;
  if (body.deadline) {
    deadline = new Date(body.deadline);
    if (Number.isNaN(deadline.getTime())) return { error: "Enter a valid target date" };
  }

  let autoPercent = body.autoPercent === undefined || body.autoPercent === "" ? 0 : Number(body.autoPercent);
  if (!Number.isFinite(autoPercent) || autoPercent < 0 || autoPercent > 100)
    return { error: "Auto-save must be between 0% and 100%" };
  autoPercent = r2(autoPercent);

  if (autoPercent > 0) {
    const others = await Goal.find({ user: userId, ...(exceptId ? { _id: { $ne: exceptId } } : {}) })
      .select("autoPercent").lean();
    const used = others.reduce((s, g) => s + (g.autoPercent || 0), 0);
    if (used + autoPercent > 100.0001) {
      const left = Math.max(0, r2(100 - used));
      return { error: `Your other goals already take ${r2(used)}% of every income. You can set up to ${left}% here.` };
    }
  }
  return { data: { name, target: r2(target), deadline, autoPercent } };
}

router.get("/", async (req, res) => {
  res.json(await Goal.find({ user: req.userId }).sort({ createdAt: 1 }));
});

router.post("/", async (req, res) => {
  try {
    const { error, data } = await build(req.body, req.userId);
    if (error) return res.status(400).json({ message: error });
    res.status(201).json(await Goal.create({ ...data, user: req.userId }));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const goal = await Goal.findOne({ _id: req.params.id, user: req.userId });
    if (!goal) return res.status(404).json({ message: "That goal wasn't found" });
    const { error, data } = await build(req.body, req.userId, goal._id);
    if (error) return res.status(400).json({ message: error });
    Object.assign(goal, data);
    await goal.save();
    res.json(goal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Savings are added automatically when income arrives, so this only takes money OUT of a goal
router.post("/:id/funds", async (req, res) => {
  try {
    const amount = r2(Number(req.body.amount));
    if (!Number.isFinite(amount) || amount === 0) return res.status(400).json({ message: "Enter an amount to withdraw" });
    if (amount > 0)
      return res.status(400).json({ message: "Savings are added automatically when you add income. You can only withdraw here." });

    const goal = await Goal.findOne({ _id: req.params.id, user: req.userId });
    if (!goal) return res.status(404).json({ message: "That goal wasn't found" });

    const accountId = req.body.account;
    if (!accountId || !mongoose.isValidObjectId(accountId))
      return res.status(400).json({ message: "Choose the account that receives the money" });
    const acc = await Account.findOne({ _id: accountId, user: req.userId });
    if (!acc) return res.status(400).json({ message: "That account wasn't found" });
    if (LIABILITIES.includes(acc.type))
      return res.status(400).json({ message: "Choose an account you own, not a card or loan" });

    let date = req.body.date ? new Date(req.body.date) : new Date();
    if (Number.isNaN(date.getTime())) date = new Date();

    const updated = await Goal.findOneAndUpdate(
      { _id: goal._id, user: req.userId, saved: { $gte: -amount - 0.005 } },
      { $inc: { saved: amount } },
      { new: true }
    );
    if (!updated) return res.status(400).json({ message: "You can't withdraw more than you've saved" });
    if (updated.saved < 0) { updated.saved = 0; await updated.save(); }

    try {
      await Transaction.create({
        user: req.userId, type: "transfer", amount: -amount, category: "Savings",
        description: `Savings from ${goal.name}`, date, goal: goal._id, account: null, toAccount: accountId,
      });
    } catch (err) {
      await Goal.updateOne({ _id: goal._id }, { $inc: { saved: -amount } });
      throw err;
    }
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Deleting a goal also removes its savings entries, so the money goes back to the accounts it came from
router.delete("/:id", async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!goal) return res.status(404).json({ message: "That goal wasn't found" });
    await Transaction.deleteMany({ user: req.userId, goal: goal._id });
    res.json({ message: "Deleted" });
  } catch {
    res.status(404).json({ message: "That goal wasn't found" });
  }
});

export default router;