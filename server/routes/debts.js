import express from "express";
import mongoose from "mongoose";
import Debt from "../models/Debt.js";
import auth from "../middleware/auth.js";
import { archiveDeleted } from "../utils/deletedItems.js";
import SharedGroup from "../models/SharedGroup.js";

const router = express.Router();
router.use(auth);
const r2 = (n) => Math.round(n * 100) / 100;

function payload(body) {
  const isGroupSplit = Boolean(body.group);
  const amountOwed = Number(body.amountOwed);
  const total = Number(body.total || body.amountOwed);
  if (!["debt", "shared"].includes(body.kind)) return { error: "Choose a valid record type" };
  if (!["owed_to_me", "i_owe"].includes(body.direction)) return { error: "Choose who owes whom" };
  if (!String(body.person || "").trim()) return { error: "Enter a person's name" };
  if (!String(body.description || "").trim()) return { error: "Describe the debt or shared bill" };
  if (!Number.isFinite(total) || total <= 0 || (!isGroupSplit && (!Number.isFinite(amountOwed) || amountOwed <= 0 || amountOwed > total)))
    return { error: "Enter a valid amount owed" };
  const dueDate = body.dueDate ? new Date(`${body.dueDate}T00:00:00.000Z`) : null;
  if (dueDate && Number.isNaN(dueDate.getTime())) return { error: "Enter a valid due date" };
  return {
    data: {
      kind: body.kind, direction: body.direction, person: String(body.person).trim().slice(0, 80),
      description: String(body.description).trim().slice(0, 160), total: r2(total), amountOwed: isGroupSplit ? 0 : r2(amountOwed),
      dueDate, date: body.date ? new Date(body.date) : new Date(), notes: String(body.notes || "").trim().slice(0, 300),
    },
  };
}

router.get("/", async (req, res) => {
  const groups = await SharedGroup.find({ members: req.userId }).select("_id").lean();
  res.json(await Debt.find({ $or: [{ user: req.userId }, { group: { $in: groups.map((g) => g._id) } }] })
    .populate("group", "name code members").sort({ status: 1, dueDate: 1, createdAt: -1 }).lean());
});

router.post("/", async (req, res) => {
  try {
    const result = payload(req.body);
    if (result.error) return res.status(400).json({ message: result.error });
    let group = null;
    if (req.body.group) {
      if (!mongoose.isValidObjectId(req.body.group)) return res.status(400).json({ message: "Choose a valid group." });
      group = await SharedGroup.findOne({ _id: req.body.group, members: req.userId });
      if (!group) return res.status(403).json({ message: "You are not a member of that group." });
      if (result.data.kind !== "shared") return res.status(400).json({ message: "Only shared bills can belong to a group." });
      const participants = Array.isArray(req.body.participants) ? req.body.participants : [];
      const memberIds = new Set(group.members.map((member) => String(member)));
      if (!participants.length) return res.status(400).json({ message: "Add at least one person to the split." });
      const invalid = participants.some((participant) => !mongoose.isValidObjectId(participant.member) || !memberIds.has(String(participant.member)) || !(Number(participant.share) > 0));
      if (invalid) return res.status(400).json({ message: "Choose valid group members and shares." });
      const shares = participants.map((participant) => ({
        member: participant.member,
        name: String(participant.name || "").trim().slice(0, 80),
        share: r2(Number(participant.share)),
      }));
      if (shares.some((participant) => !participant.name)) return res.status(400).json({ message: "Each split member needs a name." });
      const shareTotal = r2(shares.reduce((sum, participant) => sum + participant.share, 0));
      if (shareTotal !== result.data.total) return res.status(400).json({ message: "The member shares must add up to the full bill." });
      const myShare = shares.find((participant) => String(participant.member) === String(req.userId))?.share || 0;
      result.data.amountOwed = r2(result.data.direction === "owed_to_me" ? result.data.total - myShare : myShare);
      if (result.data.amountOwed <= 0) return res.status(400).json({ message: "Your share must leave an amount owed greater than zero." });
      result.data.person = shares.map((participant) => participant.name).join(", ");
      result.data.participants = shares;
    }
    res.status(201).json(await Debt.create({ ...result.data, group: group?._id || null, user: req.userId }));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:id/settle", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Not found" });
    const debt = await Debt.findOne({ _id: req.params.id, user: req.userId, status: "open" });
    if (!debt) return res.status(404).json({ message: "Open debt not found" });
    debt.payments.push({ amount: debt.amountOwed, note: "Full settlement" });
    debt.amountOwed = 0;
    debt.status = "settled";
    await debt.save();
    res.json(debt);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/:id/payment", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Not found" });
    const amount = r2(Number(req.body.amount));
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: "Enter a payment greater than zero." });
    const debt = await Debt.findOne({ _id: req.params.id, user: req.userId, status: "open" });
    if (!debt) return res.status(404).json({ message: "Open debt not found" });
    if (amount > debt.amountOwed) return res.status(400).json({ message: "Payment cannot be greater than the remaining amount." });
    debt.amountOwed = r2(debt.amountOwed - amount);
    debt.payments.push({ amount, note: String(req.body.note || "").trim().slice(0, 160) });
    if (debt.amountOwed === 0) debt.status = "settled";
    await debt.save();
    res.json(debt);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  const debt = await Debt.findOne({ _id: req.params.id, user: req.userId });
  if (!debt) return res.status(404).json({ message: "Not found" });
  await archiveDeleted(req.userId, "debt", debt);
  await debt.deleteOne();
  res.json({ message: "Deleted" });
});

export default router;
