import express from "express";
import Goal from "../models/Goal.js";
import auth from "../middleware/auth.js";

const router = express.Router();
router.use(auth);

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

// Add money to a goal (use a negative amount to withdraw)
router.post("/:id/funds", async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount === 0)
      return res.status(400).json({ message: "Enter an amount" });
    const goal = await Goal.findOne({ _id: req.params.id, user: req.userId });
    if (!goal) return res.status(404).json({ message: "Not found" });
    goal.saved = Math.max(0, Math.round((goal.saved + amount) * 100) / 100);
    await goal.save();
    res.json(goal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const goal = await Goal.findOneAndDelete({ _id: req.params.id, user: req.userId });
  if (!goal) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Deleted" });
});

export default router;