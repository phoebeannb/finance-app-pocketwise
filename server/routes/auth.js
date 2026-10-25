import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import crypto from "crypto";
import { validatePassword } from "../utils/passwordPolicy.js";
import { sendPasswordResetEmail } from "../utils/mailer.js";

const router = express.Router();
const makeToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

router.post("/register", async (req, res) => {
  try {
    const { name, password } = req.body;
    const email = req.body.email?.trim().toLowerCase();
    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });
    const problems = validatePassword(password, { email, name });
    if (problems.length)
      return res.status(400).json({ message: `Password needs: ${problems.join(", ")}` });

    if (await User.findOne({ email }))
      return res.status(400).json({ message: "Email already in use" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });
    res.status(201).json({ token: makeToken(user._id), user: { id: user._id, name, email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: "Wrong email or password" });

    res.json({ token: makeToken(user._id), user: { id: user._id, name: user.name, email } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.trim().toLowerCase() });

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      user.resetPasswordToken = crypto.createHash("sha256").update(token).digest("hex");
      user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
      await user.save();

      const link = `${process.env.CLIENT_URL}/reset-password/${token}`;
      await sendPasswordResetEmail({ to: user.email, name: user.name, link });
    }

    // Same answer whether or not the email exists, so nobody can probe for accounts
    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post("/reset-password/:token", async (req, res) => {
  try {
    const { password } = req.body;

    const hashedToken = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return res.status(400).json({ message: "Link is invalid or has expired" });

    const problems = validatePassword(password, { email: user.email, name: user.name });
    if (problems.length)
      return res.status(400).json({ message: `Password needs: ${problems.join(", ")}` });

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password updated. You can log in now." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;