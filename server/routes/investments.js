import express from "express";
import Account from "../models/Account.js";
import InvestmentEntry from "../models/InvestmentEntry.js";
import auth from "../middleware/auth.js";

const router = express.Router();
router.use(auth);

const accountFilter = (user, id) => ({ _id: id, user, type: "Investment" });

router.get("/", async (req, res) => {
  const accounts = await Account.find({ user: req.userId, type: "Investment" }).lean();
  const entries = await InvestmentEntry.find({ user: req.userId }).sort({ date: -1 }).lean();
  res.json(accounts.map((account) => {
    const list = entries.filter((entry) => String(entry.account) === String(account._id));
    const contributed = list.filter((entry) => entry.type === "contribution").reduce((sum, entry) => sum + entry.amount, 0);
    const withdrawn = list.filter((entry) => entry.type === "withdrawal").reduce((sum, entry) => sum + entry.amount, 0);
    const latestValue = list.find((entry) => entry.type === "valuation")?.amount;
    const currentValue = latestValue ?? account.balance ?? 0;
    const netInvested = contributed - withdrawn;
    return { ...account, contributed, withdrawn, netInvested, currentValue, gain: currentValue - netInvested,
      returnPct: netInvested ? ((currentValue - netInvested) / netInvested) * 100 : 0,
      entries: list };
  }));
});

router.post("/:accountId/entries", async (req, res) => {
  const { type, amount, date, note } = req.body;
  if (!["contribution", "withdrawal", "valuation"].includes(type) || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({ message: "Choose a valid entry type and amount." });
  }
  const account = await Account.findOne(accountFilter(req.userId, req.params.accountId));
  if (!account) return res.status(404).json({ message: "Investment account not found." });
  const entry = await InvestmentEntry.create({ user: req.userId, account: account._id, type, amount: Number(amount), date: date || undefined, note });
  res.status(201).json(entry);
});

router.delete("/entries/:id", async (req, res) => {
  const entry = await InvestmentEntry.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!entry) return res.status(404).json({ message: "Investment entry not found." });
  res.json({ message: "Investment entry deleted." });
});

export default router;
