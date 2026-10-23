import express from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.js";
import DeletedItem from "../models/DeletedItem.js";
import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";
import Recurring from "../models/Recurring.js";
import Budget from "../models/Budget.js";
import Goal from "../models/Goal.js";
import Debt from "../models/Debt.js";

const router = express.Router();
router.use(auth);
const models = { transaction: Transaction, account: Account, bill: Recurring, budget: Budget, goal: Goal, debt: Debt };

router.get("/", async (req, res) => {
  const items = await DeletedItem.find({ user: req.userId }).sort({ deletedAt: -1 }).lean();
  res.json(items.map((item) => ({ ...item, name: item.data.description || item.data.name || item.data.person || item.data.category || "Deleted item" })));
});

router.post("/:id/restore", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Deleted item not found" });
    const item = await DeletedItem.findOne({ _id: req.params.id, user: req.userId });
    if (!item) return res.status(404).json({ message: "Deleted item not found" });
    const Model = models[item.type];
    if (!Model) return res.status(400).json({ message: "This item cannot be restored" });
    const existing = await Model.findOne({ _id: item.originalId, user: req.userId });
    if (existing) return res.status(409).json({ message: "A current item already uses this record." });
    await Model.create({ ...item.data, _id: item.originalId, user: req.userId });
    await item.deleteOne();
    res.json({ message: "Restored" });
  } catch (err) {
    res.status(400).json({ message: err.code === 11000 ? "It conflicts with an existing record." : err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const item = await DeletedItem.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!item) return res.status(404).json({ message: "Deleted item not found" });
  res.json({ message: "Permanently deleted" });
});

export default router;
