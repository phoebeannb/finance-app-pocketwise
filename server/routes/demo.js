import express from "express";
import mongoose from "mongoose";
import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";
import Budget from "../models/Budget.js";
import Goal from "../models/Goal.js";
import Recurring from "../models/Recurring.js";
import Category from "../models/Category.js";
import Rule from "../models/Rule.js";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import { startOfToday, addDays } from "../utils/dates.js";
import { applyAutoSave } from "../utils/autosave.js";
import { nextOccurrence } from "../utils/recurring.js";
import { MOOD_KEYS } from "../utils/moods.js";

const router = express.Router();
router.use(auth);

// Small repeatable random numbers, so the demo looks the same every time
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

router.post("/load", async (req, res) => {
  try {
    const uid = new mongoose.Types.ObjectId(req.userId);
    if ((await Account.exists({ user: uid })) || (await Transaction.exists({ user: uid })))
      return res.status(400).json({
        message: "Demo data can only be loaded into an empty account, so it never mixes with your own. Use Remove demo data first if you loaded it before.",
      });

    const rand = rng(2026);
    const pick = (arr) => arr[Math.floor(rand() * arr.length)];
    const between = (a, b) => Math.round(a + rand() * (b - a));
    const today = startOfToday();
    const at = (day, hour, min) => new Date(day.getTime() + (hour * 60 + min) * 60000);

    const [bdo, gcash, cash] = await Account.create([
      { user: uid, name: "BDO Savings", type: "Bank Account", provider: "BDO Unibank", balance: 30000 },
      { user: uid, name: "GCash", type: "Bank Account", provider: "GCash", balance: 8000 },
      { user: uid, name: "Cash on hand", type: "Other", balance: 8000, notes: "Wallet money" },
    ]);
    await Account.create({ user: uid, name: "BPI Credit Card", type: "Credit Card", provider: "", balance: 2500, notes: "Amount owed" });

    // The goal comes first, so salary entries can fill it automatically
    await Goal.create({
      user: uid, name: "Emergency fund", target: 50000, autoPercent: 10,
      deadline: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 6, 1)),
    });

    await Budget.insertMany([
      { user: uid, category: "Food & Dining", limit: 6000 },
      { user: uid, category: "Transportation", limit: 2500 },
      { user: uid, category: "Groceries", limit: 5000 },
      { user: uid, category: "Entertainment", limit: 2000 },
      { user: uid, category: "Shopping", limit: 3000 },
    ]);

    const txs = [];
    const add = (day, hour, o) =>
      txs.push({ user: uid, fee: 0, mood: "", account: null, ...o, date: at(day, hour ?? between(8, 21), between(0, 59)) });
    const mood = () => (rand() < 0.35 ? pick(MOOD_KEYS) : "");

    for (let i = 89; i >= 0; i--) {
      const day = addDays(today, -i);
      const dom = day.getUTCDate();
      if (dom === 1) add(day, 9, { type: "income", amount: 35000, category: "Salary", description: "Monthly salary", account: bdo._id });
      if (dom === 2) add(day, 10, { type: "transfer", amount: 3000, fee: 15, category: "Transfer", description: "Top up GCash", account: bdo._id, toAccount: gcash._id });
      if (dom === 3) add(day, 8, { type: "expense", amount: 8000, category: "Rent/Mortgage", description: "Apartment rent", account: bdo._id });
      if (dom === 5) add(day, 19, { type: "expense", amount: 1200, category: "Personal Care", description: "Gym membership", account: bdo._id });
      if (dom === 10) add(day, 14, { type: "expense", amount: between(2000, 2700), category: "Bills & Utilities", description: "Meralco bill", account: bdo._id });
      if (dom === 12) add(day, 14, { type: "expense", amount: 1699, category: "Bills & Utilities", description: "PLDT Fibr", account: bdo._id });
      if (dom === 15) add(day, 9, { type: "expense", amount: 549, category: "Subscriptions", description: "Netflix", account: gcash._id });
      if (dom === 18) add(day, 9, { type: "expense", amount: 149, category: "Subscriptions", description: "Spotify", account: gcash._id });
      if (i % 6 === 2) add(day, null, { type: "expense", amount: between(900, 2600), category: "Groceries", description: pick(["Puregold", "SM Supermarket", "Robinsons Supermarket"]), account: bdo._id });
      if (rand() < 0.55) add(day, null, { type: "expense", amount: between(120, 480), category: "Food & Dining", description: pick(["Jollibee", "McDonald's", "Starbucks", "Mang Inasal", "Chowking", "Milk tea"]), account: gcash._id, mood: mood() });
      if (rand() < 0.5) add(day, null, { type: "expense", amount: between(40, 260), category: "Transportation", description: pick(["Grab", "Jeepney fare", "MRT ride", "Gas"]), account: cash._id });
      if (rand() < 0.08) add(day, null, { type: "expense", amount: between(300, 900), category: "Entertainment", description: pick(["Cinema", "Mobile Legends diamonds", "Steam game"]), account: bdo._id, mood: mood() });
      if (rand() < 0.05) add(day, null, { type: "expense", amount: between(500, 2500), category: "Shopping", description: pick(["Shopee order", "Lazada order", "Uniqlo"]), account: bdo._id, mood: mood() });
      if (rand() < 0.04) add(day, null, { type: "expense", amount: between(300, 1500), category: "Healthcare", description: pick(["Mercury Drug", "Clinic visit"]), account: cash._id });
    }

    // A few uncategorized items, so the Inbox has something to show
    add(today, 12, { type: "expense", amount: 95, category: "", description: "Milk tea" });
    add(addDays(today, -1), 18, { type: "expense", amount: 40, category: "", description: "Tricycle" });
    add(addDays(today, -1), 13, { type: "expense", amount: 380, category: "", description: "Lunch with friends" });

    const created = await Transaction.insertMany(txs);
    for (const t of created) if (t.type === "income") await applyAutoSave(t);

    // Bills and subscriptions (their next due dates are in the future)
    const nextOn = (dom) => {
      const last = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate();
      let d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), Math.min(dom, last)));
      if (d.getTime() <= today.getTime()) d = nextOccurrence(d, "monthly", dom);
      return d;
    };
    const bill = (name, amount, dom, category, account, valueRating, type = "expense") => ({
      user: uid, name, type, amount, category, account: account._id, cadence: "monthly",
      anchorDay: dom, nextDate: nextOn(dom), valueRating,
    });
    await Recurring.insertMany([
      bill("Salary", 35000, 1, "Salary", bdo, "neutral", "income"),
      bill("Apartment rent", 8000, 3, "Rent/Mortgage", bdo, "high"),
      bill("Gym membership", 1200, 5, "Personal Care", bdo, "unused"),
      bill("Meralco", 2300, 10, "Bills & Utilities", bdo, "high"),
      bill("PLDT Fibr", 1699, 12, "Bills & Utilities", bdo, "high"),
      bill("Netflix", 549, 15, "Subscriptions", gcash, "unused"),
      bill("Spotify", 149, 18, "Subscriptions", gcash, "neutral"),
    ]);

    await User.updateOne({ _id: uid }, { demoLoaded: true });
    res.json({ ok: true, transactions: created.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Removes EVERYTHING in the account, but only if demo data was loaded into it
router.delete("/", async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user?.demoLoaded)
      return res.status(400).json({ message: "No demo data was loaded in this account, so there's nothing to remove." });
    const f = { user: user._id };
    await Promise.all([
      Transaction.deleteMany(f), Account.deleteMany(f), Budget.deleteMany(f), Goal.deleteMany(f),
      Recurring.deleteMany(f), Category.deleteMany(f), Rule.deleteMany(f),
    ]);
    await User.updateOne({ _id: user._id }, { demoLoaded: false });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;