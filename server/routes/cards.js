import express from "express";
import Card from "../models/Card.js";
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
});

router.get("/", async (req, res) => {
  res.json(await Card.find({ user: req.userId }).sort({ createdAt: -1 }));
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

export default router;