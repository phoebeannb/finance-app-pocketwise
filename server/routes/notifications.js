import express from "express";
import auth from "../middleware/auth.js";
import Notification from "../models/Notification.js";
import Recurring from "../models/Recurring.js";
import Budget from "../models/Budget.js";
import Account from "../models/Account.js";
import Debt from "../models/Debt.js";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

const router = express.Router();
router.use(auth);

const daysUntil = (iso) => Math.round((new Date(iso).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);

router.get("/", async (req, res) => {
  const user = await User.findById(req.userId).lean();
  const settings = user?.preferences?.notifications || {};
  const items = [];
  if (settings.bills !== false) {
    const bills = await Recurring.find({ user: req.userId, active: true, type: "expense" }).lean();
    bills.filter((bill) => daysUntil(bill.nextDate) <= (bill.reminderDays ?? 3)).forEach((bill) => items.push({
      sourceKey: `bill-${bill._id}`, tone: daysUntil(bill.nextDate) < 0 ? "red" : "amber",
      title: daysUntil(bill.nextDate) < 0 ? `${bill.name} is overdue` : `${bill.name} is due soon`,
      detail: `Due in ${daysUntil(bill.nextDate)} day(s)`, to: "/bills",
    }));
  }
  if (settings.budgets !== false) {
    const budgets = await Budget.find({ user: req.userId }).lean();
    const spent = await Transaction.aggregate([
      { $match: { user: user._id, type: "expense" } },
      { $group: { _id: { $toLower: "$category" }, total: { $sum: "$amount" } } },
    ]);
    const spentMap = Object.fromEntries(spent.map((row) => [row._id, row.total]));
    budgets.filter((budget) => (spentMap[budget.category.toLowerCase()] || 0) >= budget.limit * 0.8).forEach((budget) => {
      const currentSpent = spentMap[budget.category.toLowerCase()] || 0;
      items.push({
      sourceKey: `budget-${budget._id}`, tone: currentSpent >= budget.limit ? "red" : "amber",
      title: currentSpent >= budget.limit ? `${budget.category} is over budget` : `${budget.category} is near its limit`,
      detail: "Review your budget progress", to: "/budgets",
      });
    });
  }
  if (settings.balances !== false) {
    const accounts = await Account.find({ user: req.userId }).lean();
    accounts.filter((account) => account.balance < 0).forEach((account) => items.push({
      sourceKey: `account-${account._id}`, tone: "red", title: `${account.name} has a negative balance`,
      detail: "Review this wallet", to: "/accounts",
    }));
  }
  if (settings.debts !== false) {
    const debts = await Debt.find({ user: req.userId, status: "open" }).lean();
    debts.forEach((debt) => items.push({
      sourceKey: `debt-${debt._id}`, tone: "indigo", title: `Open debt: ${debt.description || "Review payment"}`,
      detail: "Payment is still outstanding", to: "/debts",
    }));
  }
  await Promise.all(items.map((item) => Notification.findOneAndUpdate(
    { user: req.userId, sourceKey: item.sourceKey }, { ...item, user: req.userId, active: true }, { upsert: true, new: true, setDefaultsOnInsert: true }
  )));
  const activeKeys = items.map((item) => item.sourceKey);
  if (activeKeys.length) await Notification.updateMany({ user: req.userId, sourceKey: { $nin: activeKeys } }, { active: false });
  const notifications = await Notification.find({ user: req.userId, active: true }).sort({ readAt: 1, createdAt: -1 }).lean();
  res.json(notifications);
});

router.get("/preferences", async (req, res) => {
  const user = await User.findById(req.userId).lean();
  res.json(user?.preferences?.notifications || { bills: true, budgets: true, balances: true, debts: true });
});

router.put("/preferences", async (req, res) => {
  const allowed = ["bills", "budgets", "balances", "debts"];
  const notifications = Object.fromEntries(allowed.map((key) => [key, req.body[key] !== false]));
  const user = await User.findByIdAndUpdate(req.userId, { "preferences.notifications": notifications }, { new: true });
  res.json(user.preferences.notifications);
});

router.post("/read-all", async (req, res) => {
  await Notification.updateMany({ user: req.userId, active: true }, { readAt: new Date() });
  res.json({ message: "Notifications marked as read." });
});

router.post("/:id/read", async (req, res) => {
  const item = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.userId }, { readAt: new Date() }, { new: true });
  if (!item) return res.status(404).json({ message: "Notification not found." });
  res.json(item);
});

export default router;
