import express from "express";
import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";
import auth from "../middleware/auth.js";
import { archiveDeleted } from "../utils/deletedItems.js";

const router = express.Router();
router.use(auth);

const LIABILITIES = ["Credit Card", "Loan"];
const r2 = (n) => Math.round(n * 100) / 100;

const pick = ({ name, type, provider, balance, notes, color }) => ({
  name,
  type,
  notes,
  provider: type === "Bank Account" ? provider : "",
  balance: Number(balance) || 0,
  color: ["indigo", "blue", "green", "amber", "rose", "slate"].includes(color) ? color : "indigo",
});

router.get("/", async (req, res) => {
  const accounts = await Account.find({ user: req.userId }).sort({ createdAt: -1 }).lean();
  const txs = await Transaction.find({
    user: req.userId,
    $or: [{ account: { $ne: null } }, { toAccount: { $ne: null } }],
  }).select("type amount fee account toAccount").lean();

  // income +, expense -, transfer out -(amount + fee), transfer in +amount
  const delta = {};
  const add = (id, n) => { if (id) delta[id] = (delta[id] || 0) + n; };
  for (const t of txs) {
    if (t.type === "income") add(t.account, t.amount);
    else if (t.type === "expense") add(t.account, -t.amount);
    else if (t.type === "transfer") {
      add(t.account, -(t.amount + (t.fee || 0)));
      add(t.toAccount, t.amount);
    }
  }

  // For credit cards and loans the balance is money owed, so the effect flips
  res.json(accounts.map((a) => {
    const d = delta[a._id] || 0;
    const current = LIABILITIES.includes(a.type) ? a.balance - d : a.balance + d;
    return { ...a, currentBalance: r2(current) };
  }));
});

router.post("/", async (req, res) => {
  try {
    const account = await Account.create({ ...pick(req.body), user: req.userId });
    res.status(201).json(account);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const account = await Account.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      pick(req.body),
      { new: true, runValidators: true }
    );
    if (!account) return res.status(404).json({ message: "Not found" });
    res.json(account);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, user: req.userId });
    if (!account) return res.status(404).json({ message: "Not found" });

    const count = await Transaction.countDocuments({
      user: req.userId,
      $or: [{ account: account._id }, { toAccount: account._id }],
    });
    if (count > 0)
      return res.status(400).json({
        message: `This account has ${count} transaction${count === 1 ? "" : "s"}. Delete them first so your balances stay correct.`,
      });

    await archiveDeleted(req.userId, "account", account);
    await account.deleteOne();
    res.json({ message: "Deleted" });
  } catch {
    res.status(404).json({ message: "Not found" });
  }
});

router.get("/:id/transactions", async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.id, user: req.userId });
    if (!account) return res.status(404).json({ message: "Not found" });
    const txs = await Transaction.find({
      user: req.userId,
      $or: [{ account: account._id }, { toAccount: account._id }],
    }).sort({ date: -1, createdAt: -1 }).limit(20).lean();
    res.json(txs);
  } catch {
    res.status(404).json({ message: "Not found" });
  }
});

export default router;