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

const pick = (b) => ({
  name: b.name,
  target: Number(b.target),
  deadline: b.deadline ? new Date(b.deadline) : null,
});

router.get("/", async (req, res) => {
  res.json(await Goal.find({ user: req.userId }).sort({ createdAt: 1 }));
});

router.post("/", async (req, res) => {
  try {
    const goal = await Goal.create({ ...pick(req.body), user: req.userId });
    res.status(201).json(goal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const goal = await Goal.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      pick(req.body),
      { new: true, runValidators: true }
    );
    if (!goal) return res.status(404).json({ message: "Not found" });
    res.json(goal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Add savings (positive amount) or withdraw (negative amount).
// With an account, the money moves out of / back into that account.
router.post("/:id/funds", async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount === 0)
      return res.status(400).json({ message: "Enter an amount" });

    const goal = await Goal.findOne({ _id: req.params.id, user: req.userId });
    if (!goal) return res.status(404).json({ message: "Not found" });
    if (amount < 0 && -amount > goal.saved)
      return res.status(400).json({ message: "You can't withdraw more than you've saved" });

    const accountId = req.body.account || null;
    if (accountId) {
      if (!mongoose.isValidObjectId(accountId)) return res.status(400).json({ message: "Invalid account" });
      const acc = await Account.findOne({ _id: accountId, user: req.userId });
      if (!acc) return res.status(400).json({ message: "Account not found" });
      if (LIABILITIES.includes(acc.type))
        return res.status(400).json({ message: "Choose an account you own, not a card or loan" });
    }

    let date = req.body.date ? new Date(req.body.date) : new Date();
    if (Number.isNaN(date.getTime())) date = new Date();

    if (accountId) {
      await Transaction.create({
        user: req.userId,
        type: "transfer",
        amount: Math.abs(amount),
        category: "Savings",
        description: `${amount > 0 ? "Savings to" : "Savings from"} ${goal.name}`,
        date,
        goal: goal._id,
        account: amount > 0 ? accountId : null,   // deposit: money leaves the account
        toAccount: amount < 0 ? accountId : null, // withdrawal: money returns to the account
      });
    }

    goal.saved = Math.max(0, r2(goal.saved + amount));
    await goal.save();
    res.json(goal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!goal) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch {
    res.status(404).json({ message: "Not found" });
  }
});

export default router;