import express from "express";
import mongoose from "mongoose";
import auth from "../middleware/auth.js";
import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";
import Budget from "../models/Budget.js";
import Goal from "../models/Goal.js";
import Recurring from "../models/Recurring.js";
import Card from "../models/Card.js";
import Category from "../models/Category.js";
import Rule from "../models/Rule.js";
import Debt from "../models/Debt.js";

const router = express.Router();
router.use(auth);

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const limit = 5;

router.get("/", async (req, res) => {
  const query = String(req.query.q || "").trim().slice(0, 80);
  if (query.length < 2) return res.json([]);
  const rx = new RegExp(escapeRegex(query), "i");
  const user = new mongoose.Types.ObjectId(req.userId);

  const [transactions, accounts, budgets, goals, recurring, cards, categories, rules, debts] = await Promise.all([
    Transaction.find({ user, $or: [{ description: rx }, { category: rx }, { notes: rx }, { tags: rx }] })
      .sort({ date: -1 }).limit(limit).populate("account", "name").populate("toAccount", "name").lean(),
    Account.find({ user, $or: [{ name: rx }, { provider: rx }, { notes: rx }] }).limit(limit).lean(),
    Budget.find({ user, category: rx }).limit(limit).lean(),
    Goal.find({ user, name: rx }).limit(limit).lean(),
    Recurring.find({ user, $or: [{ name: rx }, { category: rx }] }).limit(limit).lean(),
    Card.find({ user, $or: [{ nickname: rx }, { issuer: rx }, { last4: rx }] }).limit(limit).lean(),
    Category.find({ user, $or: [{ name: rx }, { parent: rx }] }).limit(limit).lean(),
    Rule.find({ user, $or: [{ keyword: rx }, { category: rx }] }).limit(limit).lean(),
    Debt.find({ user, $or: [{ person: rx }, { description: rx }, { notes: rx }] }).limit(limit).lean(),
  ]);

  res.json([
    ...transactions.map((t) => ({ id: t._id, kind: "Transactions", title: t.description || t.category || "Transaction", subtitle: `${t.type} · ${t.category || "Uncategorized"}`, path: `/transactions?q=${encodeURIComponent(t.description || query)}` })),
    ...accounts.map((a) => ({ id: a._id, kind: "Accounts", title: a.name, subtitle: a.provider || a.type, path: "/accounts" })),
    ...budgets.map((b) => ({ id: b._id, kind: "Budgets", title: b.category, subtitle: "Budget", path: "/budgets" })),
    ...goals.map((g) => ({ id: g._id, kind: "Goals", title: g.name, subtitle: "Savings goal", path: "/goals" })),
    ...recurring.map((r) => ({ id: r._id, kind: "Bills", title: r.name, subtitle: `${r.type} · ${r.category || "Uncategorized"}`, path: "/bills" })),
    ...cards.map((c) => ({ id: c._id, kind: "Cards", title: c.nickname, subtitle: `${c.issuer || c.network} ···· ${c.last4 || "----"}`, path: "/accounts" })),
    ...categories.map((c) => ({ id: c._id, kind: "Categories", title: c.name, subtitle: `${c.type} category`, path: "/settings?tab=categories" })),
    ...rules.map((r) => ({ id: r._id, kind: "Rules", title: r.keyword, subtitle: `Categorizes as ${r.category}`, path: "/settings?tab=categories" })),
    ...debts.map((d) => ({ id: d._id, kind: "Debts", title: d.person, subtitle: d.description, path: "/debts" })),
  ].slice(0, 30));
});

export default router;
