import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";
import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import Goal from "../models/Goal.js";
import Card from "../models/Card.js";
import Category from "../models/Category.js";
import Rule from "../models/Rule.js";
import Recurring from "../models/Recurring.js";
import auth from "../middleware/auth.js";
import { validatePassword } from "../utils/passwordPolicy.js";

const router = express.Router();
router.use(auth);

const CURRENCIES = ["PHP", "USD", "EUR", "GBP", "JPY", "SGD", "AUD", "CAD", "HKD", "CNY", "KRW", "AED", "SAR"];
const DATE_FORMATS = ["medium", "dmy", "mdy", "iso"];

/* ---------- Profile ---------- */

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

/* ---------- Preferences ---------- */

const prefsOf = async (user) => {
  let defaultAccount = user.preferences?.defaultAccount || null;
  // If that account was deleted, quietly forget it
  if (defaultAccount && !(await Account.exists({ _id: defaultAccount, user: user._id }))) defaultAccount = null;
  return {
    currency: user.preferences?.currency || "PHP",
    dateFormat: user.preferences?.dateFormat || "medium",
    defaultAccount: defaultAccount ? String(defaultAccount) : null,
  };
};

router.get("/preferences", async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "Not found" });
  res.json(await prefsOf(user));
});

router.put("/preferences", async (req, res) => {
  try {
    const { currency, dateFormat } = req.body;
    if (!CURRENCIES.includes(currency)) return res.status(400).json({ message: "Choose a supported currency" });
    if (!DATE_FORMATS.includes(dateFormat)) return res.status(400).json({ message: "Choose a supported date format" });

    let defaultAccount = null;
    if (req.body.defaultAccount) {
      if (!mongoose.isValidObjectId(req.body.defaultAccount)) return res.status(400).json({ message: "Invalid account" });
      if (!(await Account.exists({ _id: req.body.defaultAccount, user: req.userId })))
        return res.status(400).json({ message: "Account not found" });
      defaultAccount = req.body.defaultAccount;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { $set: { "preferences.currency": currency, "preferences.dateFormat": dateFormat, "preferences.defaultAccount": defaultAccount } },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "Not found" });
    res.json(await prefsOf(user));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

/* ---------- Export ---------- */

// One CSV cell. Text starting with = + - @ gets a leading ' so Excel can't run it as a formula.
const cell = (v) => {
  if (v === null || v === undefined) return "";
  let s;
  if (v instanceof Date) s = v.toISOString().slice(0, 16).replace("T", " ");
  else if (typeof v === "number") s = v.toFixed(2);
  else {
    s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  }
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const toCsv = (headers, rows) =>
  "\uFEFF" + [headers, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
const strip = (docs) => docs.map(({ user, __v, ...rest }) => rest); // eslint-disable-line no-unused-vars

router.get("/export/:what", async (req, res) => {
  try {
    const what = req.params.what;
    const f = { user: req.userId };
    const stamp = new Date().toISOString().slice(0, 10);
    const send = (name, type, body) => {
      res.setHeader("Content-Type", `${type}; charset=utf-8`);
      res.setHeader("Content-Disposition", `attachment; filename="${name}"`);
      res.send(body);
    };

    if (what === "transactions") {
      const txs = await Transaction.find(f).sort({ date: -1 })
        .populate("account", "name").populate("toAccount", "name").lean();
      return send(`pocketwise-transactions-${stamp}.csv`, "text/csv", toCsv(
        ["Date", "Type", "Category", "Description", "Account", "To account", "Amount", "Fee"],
        txs.map((t) => [t.date, t.type, t.category, t.description, t.account?.name, t.toAccount?.name, t.amount, t.fee || 0])
      ));
    }

    if (what === "accounts") {
      const accs = await Account.find(f).sort({ createdAt: 1 }).lean();
      return send(`pocketwise-accounts-${stamp}.csv`, "text/csv", toCsv(
        ["Name", "Type", "Bank / E-wallet", "Starting balance", "Notes", "Created"],
        accs.map((a) => [a.name, a.type, a.provider, a.balance, a.notes, day(a.createdAt)])
      ));
    }

    if (what === "goals") {
      const goals = await Goal.find(f).sort({ createdAt: 1 }).lean();
      return send(`pocketwise-goals-${stamp}.csv`, "text/csv", toCsv(
        ["Name", "Target", "Saved", "Target date", "Created"],
        goals.map((g) => [g.name, g.target, g.saved, day(g.deadline), day(g.createdAt)])
      ));
    }

    if (what === "all") {
      const [me, accounts, transactions, budgets, goals, cards, recurring, categories, rules] = await Promise.all([
        User.findById(req.userId).select("name email createdAt").lean(),
        Account.find(f).lean(), Transaction.find(f).sort({ date: -1 }).lean(), Budget.find(f).lean(),
        Goal.find(f).lean(), Card.find(f).lean(), Recurring.find(f).lean(),
        Category.find(f).lean(), Rule.find(f).lean(),
      ]);
      const body = {
        exportedAt: new Date().toISOString(),
        profile: { name: me?.name, email: me?.email, joined: me?.createdAt },
        accounts: strip(accounts), transactions: strip(transactions), budgets: strip(budgets),
        goals: strip(goals), cards: strip(cards), bills: strip(recurring),
        categories: strip(categories), importRules: strip(rules),
      };
      return send(`pocketwise-backup-${stamp}.json`, "application/json", JSON.stringify(body, null, 2));
    }

    res.status(404).json({ message: "Unknown export" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ---------- Delete account ---------- */

// Needs the password. Your data goes first and the user record last, so if anything fails
// halfway you can simply try again.
router.delete("/", async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || !(await bcrypt.compare(String(req.body?.password || ""), user.password)))
      return res.status(400).json({ message: "Password is wrong" });

    const f = { user: user._id };
    await Promise.all([
      Transaction.deleteMany(f), Account.deleteMany(f), Budget.deleteMany(f), Goal.deleteMany(f),
      Card.deleteMany(f), Category.deleteMany(f), Rule.deleteMany(f), Recurring.deleteMany(f),
    ]);
    await user.deleteOne();
    res.json({ message: "Account deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;