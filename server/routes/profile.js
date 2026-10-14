import express from "express";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import { validatePassword } from "../utils/passwordPolicy.js";

const router = express.Router();
router.use(auth);

router.get("/", async (req, res) => {
  const user = await User.findById(req.userId).select("name email createdAt");
  if (!user) return res.status(404).json({ message: "Not found" });
  res.json({ id: user._id, name: user.name, email: user.email, createdAt: user.createdAt });
});

router.put("/", async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    if (!name || !email) return res.status(400).json({ message: "Name and email are required" });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: "Enter a valid email" });

    const taken = await User.findOne({ email, _id: { $ne: req.userId } });
    if (taken) return res.status(400).json({ message: "Email already in use" });

    const user = await User.findByIdAndUpdate(req.userId, { name, email }, { new: true });
    res.json({ user: { id: user._id, name: user.name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put("/password", async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);
    if (!user || !(await bcrypt.compare(currentPassword || "", user.password)))
      return res.status(400).json({ message: "Current password is wrong" });

    const problems = validatePassword(newPassword, { email: user.email, name: user.name });
    if (problems.length)
      return res.status(400).json({ message: `Password needs: ${problems.join(", ")}` });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: "Password updated" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;