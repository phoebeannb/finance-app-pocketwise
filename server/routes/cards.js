import express from "express";
import Card from "../models/Card.js";
import CreditPayment from "../models/CreditPayment.js";
import auth from "../middleware/auth.js";

const router = express.Router();
router.use(auth);

const pick = (b) => ({
  nickname: b.nickname,
  issuer: b.issuer,
  network: b.network,
  kind: b.kind,
  last4: b.last4 || null,
  dueDay: b.dueDay ? Number(b.dueDay) : null,
  creditLimit: b.creditLimit ? Number(b.creditLimit) : null,
  currentBalance: b.currentBalance == null ? 0 : Number(b.currentBalance),
});

router.get("/", async (req, res) => {
  const cards = await Card.find({ user: req.userId }).sort({ createdAt: -1 }).lean();
  const payments = await CreditPayment.find({ user: req.userId }).sort({ date: -1 }).lean();
  res.json(cards.map((card) => ({
    ...card,
    payments: payments.filter((payment) => String(payment.card) === String(card._id)),
    utilization: card.creditLimit ? (card.currentBalance / card.creditLimit) * 100 : null,
  })));
});

router.post("/", async (req, res) => {
  try {
    const card = await Card.create({ ...pick(req.body), user: req.userId });
    res.status(201).json(card);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const card = await Card.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      pick(req.body),
      { new: true, runValidators: true }
    );
    if (!card) return res.status(404).json({ message: "Not found" });
    res.json(card);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const card = await Card.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!card) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Deleted" });
});

router.post("/:id/payments", async (req, res) => {
  const amount = Number(req.body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Enter a payment greater than zero." });
  const card = await Card.findOne({ _id: req.params.id, user: req.userId });
  if (!card) return res.status(404).json({ message: "Card not found." });
  if (amount > card.currentBalance) return res.status(400).json({ message: "Payment cannot exceed the current balance." });
  const payment = await CreditPayment.create({ user: req.userId, card: card._id, amount, date: req.body.date || undefined, note: req.body.note });
  card.currentBalance -= amount;
  await card.save();
  res.status(201).json(payment);
});

router.delete("/:id/payments/:paymentId", async (req, res) => {
  const payment = await CreditPayment.findOneAndDelete({ _id: req.params.paymentId, card: req.params.id, user: req.userId });
  if (!payment) return res.status(404).json({ message: "Payment not found." });
  await Card.updateOne({ _id: req.params.id, user: req.userId }, { $inc: { currentBalance: payment.amount } });
  res.json({ message: "Payment deleted." });
});

export default router;