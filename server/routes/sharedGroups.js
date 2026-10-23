import crypto from "crypto";
import express from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.js";
import SharedGroup from "../models/SharedGroup.js";

const router = express.Router();
router.use(auth);
const code = () => crypto.randomBytes(4).toString("hex").toUpperCase();

router.get("/", async (req, res) => {
  const groups = await SharedGroup.find({ members: req.userId })
    .populate("members", "name email").sort({ createdAt: -1 }).lean();
  res.json(groups);
});

router.post("/", async (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 80);
  if (!name) return res.status(400).json({ message: "Enter a group name." });
  let inviteCode = code();
  while (await SharedGroup.exists({ code: inviteCode })) inviteCode = code();
  const group = await SharedGroup.create({ name, code: inviteCode, owner: req.userId, members: [req.userId] });
  res.status(201).json(await group.populate("members", "name email"));
});

router.post("/join", async (req, res) => {
  const inviteCode = String(req.body.code || "").trim().toUpperCase();
  if (!/^[A-F0-9]{8}$/.test(inviteCode)) return res.status(400).json({ message: "Enter the 8-character group code." });
  const group = await SharedGroup.findOneAndUpdate(
    { code: inviteCode },
    { $addToSet: { members: req.userId } },
    { new: true }
  ).populate("members", "name email");
  if (!group) return res.status(404).json({ message: "That group code was not found." });
  res.json(group);
});

router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ message: "Group not found." });
  const group = await SharedGroup.findOne({ _id: req.params.id, members: req.userId }).populate("members", "name email").lean();
  if (!group) return res.status(404).json({ message: "Group not found." });
  res.json(group);
});

export default router;
