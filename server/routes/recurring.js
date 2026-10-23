import express from "express";
import mongoose from "mongoose";
import Recurring from "../models/Recurring.js";
import Account from "../models/Account.js";
import auth from "../middleware/auth.js";
import { startOfToday } from "../utils/dates.js";
import { processDue, nextOccurrence, firstOnOrAfter } from "../utils/recurring.js";
import { archiveDeleted } from "../utils/deletedItems.js";

const router = express.Router();
router.use(auth);

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const CADENCES = ["weekly", "monthly", "yearly"];
const VALUE_RATINGS = ["high", "neutral", "unused"];
const r2 = (n) => Math.round(n * 100) / 100;

async function build(body, userId, existing) {
  const name = String(body.name || "").trim().slice(0, 60);
  if (!name) return { error: "Give it a name" };
  if (!["expense", "income"].includes(body.type)) return { error: "Invalid type" };
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 1e9) return { error: "Enter an amount greater than 0" };
  if (!CADENCES.includes(body.cadence)) return { error: "Choose how often it repeats" };
  if (!YMD.test(body.nextDate || "")) return { error: "Pick the next due date" };
  if (body.trialEnds && !YMD.test(body.trialEnds)) return { error: "Invalid trial end date" };
  const reminderDays = Number(body.reminderDays ?? 3);
  if (!Number.isInteger(reminderDays) || reminderDays < 0 || reminderDays > 30) return { error: "Reminder days must be between 0 and 30" };

  const next = new Date(`${body.nextDate}T00:00:00.000Z`);
  if (Number.isNaN(next.getTime())) return { error: "Invalid date" };
  const unchanged = existing && existing.nextDate.getTime() === next.getTime();
  if (!unchanged && next.getTime() < startOfToday().getTime())
    return { error: "The next due date can't be in the past" };

  let account = null;
  if (body.account) {
    if (!mongoose.isValidObjectId(body.account)) return { error: "Invalid account" };
    if (!(await Account.exists({ _id: body.account, user: userId }))) return { error: "Account not found" };
    account = body.account;
  }

  return {
    data: {
      name, type: body.type, amount: r2(amount),
      category: String(body.category || "").trim().slice(0, 60),
      account, cadence: body.cadence, nextDate: next, anchorDay: next.getUTCDate(),
      autoRenew: Boolean(body.autoRenew),
      trialEnds: body.trialEnds ? new Date(`${body.trialEnds}T00:00:00.000Z`) : null,
      reminderDays,
    },
  };
}

router.get("/", async (req, res) => {
  try {
    await processDue({ user: req.userId }); // opening the page also catches up, so nothing waits for the hourly job
  } catch (err) {
    console.error("Recurring catch-up failed:", err.message);
  }
  res.json(await Recurring.find({ user: req.userId }).sort({ nextDate: 1 }).populate("account", "name"));
});

router.post("/", async (req, res) => {
  try {
    const { error, data } = await build(req.body, req.userId);
    if (error) return res.status(400).json({ message: error });
    const item = await Recurring.create({ ...data, user: req.userId });
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const existing = await Recurring.findOne({ _id: req.params.id, user: req.userId });
    if (!existing) return res.status(404).json({ message: "Not found" });
    const { error, data } = await build(req.body, req.userId, existing);
    if (error) return res.status(400).json({ message: error });
    Object.assign(existing, data);
    await existing.save();
    res.json(existing);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:id/rating", async (req, res) => {
  try {
    const { rating } = req.body;
    if (!VALUE_RATINGS.includes(rating)) return res.status(400).json({ message: "Invalid bill value rating" });

    const item = await Recurring.findOneAndUpdate(
      { _id: req.params.id, user: req.userId, type: "expense" },
      { valueRating: rating },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: "Bill not found" });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Pause / resume. Resuming skips what was missed while paused instead of posting it all at once.
router.post("/:id/toggle", async (req, res) => {
  try {
    const item = await Recurring.findOne({ _id: req.params.id, user: req.userId });
    if (!item) return res.status(404).json({ message: "Not found" });
    if (item.active) {
      item.active = false;
    } else {
      item.nextDate = firstOnOrAfter(item.nextDate, item.cadence, item.anchorDay, startOfToday());
      item.active = true;
    }
    await item.save();
    res.json(item);
  } catch {
    res.status(404).json({ message: "Not found" });
  }
});

// Skip the next due date without posting anything
router.post("/:id/skip", async (req, res) => {
  try {
    const item = await Recurring.findOne({ _id: req.params.id, user: req.userId });
    if (!item) return res.status(404).json({ message: "Not found" });
    item.nextDate = nextOccurrence(item.nextDate, item.cadence, item.anchorDay);
    await item.save();
    res.json(item);
  } catch {
    res.status(404).json({ message: "Not found" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const item = await Recurring.findOne({ _id: req.params.id, user: req.userId });
    if (!item) return res.status(404).json({ message: "Not found" });
    await archiveDeleted(req.userId, "bill", item);
    await item.deleteOne();
    res.json({ message: "Deleted" });
  } catch {
    res.status(404).json({ message: "Not found" });
  }
});

export default router;