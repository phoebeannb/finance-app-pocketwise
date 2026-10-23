import express from "express";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";
import Goal from "../models/Goal.js";
import Rule from "../models/Rule.js";
import auth from "../middleware/auth.js";
import { startOfToday, startOfThisMonth, addDays } from "../utils/dates.js";
import { applyAutoSave, reverseAutoSave } from "../utils/autosave.js";
import { prepareRules, suggestCategory } from "../utils/autoCategory.js";
import { MOOD_KEYS } from "../utils/moods.js";
import { archiveDeleted } from "../utils/deletedItems.js";

const router = express.Router();
router.use(auth);

const TYPES = ["income", "expense", "transfer"];
const isId = (v) => mongoose.isValidObjectId(v);
const r2 = (n) => Math.round(n * 100) / 100;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const YMD = /^\d{4}-\d{2}-\d{2}$/;
const UNSORTED = [{ category: "" }, { category: null }]; // no category yet = waiting in the inbox
const withAuto = (tx, autoSaved) => ({ ...tx.toObject(), autoSaved });

const cleanTags = (value) => {
  const out = [];
  for (const raw of Array.isArray(value) ? value : []) {
    const t = String(raw || "").trim().replace(/^#+/, "").toLowerCase().replace(/\s+/g, "-").slice(0, 20);
    if (t && !out.includes(t)) out.push(t);
    if (out.length === 5) break;
  }
  return out;
};

async function buildPayload(body, userId) {
  const type = body.type;
  const amount = Number(body.amount);
  if (!TYPES.includes(type)) return { error: "Choose Income, Expense or Transfer" };
  if (!Number.isFinite(amount) || amount <= 0) return { error: "Enter an amount greater than 0" };

  const date = body.date ? new Date(body.date) : new Date();
  if (Number.isNaN(date.getTime())) return { error: "Enter a valid date" };

  const accountId = body.account || null;
  const toId = type === "transfer" ? body.toAccount || null : null;

  let fee = 0;
  if (type === "transfer" && body.fee !== undefined && body.fee !== null && body.fee !== "") {
    fee = Number(body.fee);
    if (!Number.isFinite(fee) || fee < 0) return { error: "The transfer fee must be 0 or more" };
  }

  const data = {
    type,
    amount: r2(amount),
    fee: r2(fee),
    date,
    description: (body.description || "").toString().trim().slice(0, 200),
    notes: (body.notes || "").toString().trim().slice(0, 500),
    tags: type !== "transfer" ? cleanTags(body.tags) : [],
    category: type === "transfer" ? "Transfer" : (body.category || "").toString().trim().slice(0, 60),
    mood: type !== "transfer" && MOOD_KEYS.includes(body.mood) ? body.mood : "",
    account: accountId,
    toAccount: toId,
  };

  if (type !== "transfer" && Array.isArray(body.splits) && body.splits.length) {
    const splits = body.splits.map((part) => ({
      category: String(part.category || "").trim().slice(0, 60),
      amount: r2(Number(part.amount)),
    }));
    if (splits.some((part) => !part.category || !Number.isFinite(part.amount) || part.amount <= 0))
      return { error: "Each split needs a category and an amount greater than 0" };
    if (Math.abs(splits.reduce((sum, part) => sum + part.amount, 0) - data.amount) > 0.01)
      return { error: "Split amounts must add up to the transaction amount" };
    data.splits = splits;
    data.category = "Split transaction";
  }

  if (type === "transfer") {
    if (!accountId || !toId) return { error: "Choose both the account to take from and the account to send to" };
    if (String(accountId) === String(toId)) return { error: "Pick two different accounts" };
  }

  const ids = [accountId, toId].filter(Boolean);
  if (ids.some((id) => !isId(id))) return { error: "That account isn't valid. Choose one from the list" };
  if (ids.length) {
    const found = await Account.countDocuments({ _id: { $in: ids }, user: userId });
    if (found !== new Set(ids.map(String)).size) return { error: "That account wasn't found. It may have been deleted" };
  }

  return { data };
}

// The same filters power the list, the day totals and the CSV export
function buildMatch(query, userId) {
  const { q, type, category, account, from, to, min, max, tag } = query;
  const and = [{ user: new mongoose.Types.ObjectId(userId) }];

  if (TYPES.includes(type)) and.push({ type });
  if (category) and.push({ category: new RegExp(`^${escapeRegex(String(category).slice(0, 60))}$`, "i") });
  if (query.uncategorized === "1") {
    and.push({ type: { $in: ["income", "expense"] } });
    and.push({ $or: UNSORTED });
  }
  if (isId(account)) {
    const a = new mongoose.Types.ObjectId(account);
    and.push({ $or: [{ account: a }, { toAccount: a }] });
  }
  if (tag) and.push({ tags: String(tag).toLowerCase().slice(0, 20) });
  const text = String(q || "").trim().slice(0, 60);
  if (text) {
    const rx = new RegExp(escapeRegex(text), "i");
    and.push({ $or: [{ description: rx }, { category: rx }, { notes: rx }, { tags: rx }] });
  }
  if (YMD.test(from || "")) and.push({ date: { $gte: new Date(`${from}T00:00:00.000Z`) } });
  if (YMD.test(to || "")) and.push({ date: { $lt: new Date(new Date(`${to}T00:00:00.000Z`).getTime() + 86400000) } });
  if (min !== undefined && min !== "" && Number.isFinite(Number(min))) and.push({ amount: { $gte: Number(min) } });
  if (max !== undefined && max !== "" && Number.isFinite(Number(max))) and.push({ amount: { $lte: Number(max) } });

  return { and, match: { $and: and } };
}

// Deleting also undoes automatic savings and fixes the goal total
async function deleteTx(userId, id) {
  const tx = await Transaction.findOne({ _id: id, user: userId });
  if (!tx) return null;
  await archiveDeleted(userId, "transaction", tx);
  await tx.deleteOne();
  if (tx.type === "income") await reverseAutoSave(userId, tx._id);
  if (tx.goal) {
    const goal = await Goal.findOne({ _id: tx.goal, user: userId });
    if (goal) {
      const change = tx.account ? -tx.amount : tx.amount; // deposit → remove, withdrawal → put back
      goal.saved = Math.max(0, r2(goal.saved + change));
      await goal.save();
    }
  }
  return tx;
}

router.get("/", async (req, res) => {
  const filter = { user: req.userId };
  if (TYPES.includes(req.query.type)) filter.type = req.query.type;
  const items = await Transaction.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .limit(Number(req.query.limit) || 0)
    .populate("account", "name type")
    .populate("toAccount", "name type");
  res.json(items);
});

// Your most-used categories (last 90 days), so the Add transaction form offers them first
router.get("/frequent", async (req, res) => {
  try {
    const since = addDays(startOfToday(), -90);
    const rows = await Transaction.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(req.userId), type: { $in: ["income", "expense"] }, date: { $gte: since }, category: { $nin: ["", null] } } },
      { $group: { _id: { t: "$type", c: "$category" }, n: { $sum: 1 } } },
      { $sort: { n: -1 } },
    ]);
    const pick = (t) => rows.filter((r) => r._id.t === t).slice(0, 6).map((r) => r._id.c);
    res.json({ expense: pick("expense"), income: pick("income") });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// The inbox: income and expenses that still have no category, each with a suggested one
router.get("/inbox", async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 5));
    const base = { user: new mongoose.Types.ObjectId(req.userId), type: { $in: ["income", "expense"] }, $or: UNSORTED };
    const today = startOfToday();
    const [count, yesterday, docs, ruleDocs] = await Promise.all([
      Transaction.countDocuments(base),
      Transaction.countDocuments({ ...base, date: { $gte: addDays(today, -1), $lt: today } }),
      Transaction.find(base).sort({ date: -1, createdAt: -1 }).limit(limit).populate("account", "name type"),
      Rule.find({ user: req.userId }).lean(),
    ]);
    const rules = prepareRules(ruleDocs);
    res.json({
      count,
      yesterday,
      items: docs.map((d) => ({ ...d.toObject(), suggestion: suggestCategory(d.description, d.type, rules).category })),
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Smart defaults: what category (and account) did you use the last time you typed this?
router.get("/suggest", async (req, res) => {
  try {
    const description = String(req.query.description || "").trim().slice(0, 200);
    const type = req.query.type === "income" ? "income" : "expense";
    if (description.length < 3) return res.json({});

    const last = await Transaction.findOne({
      user: req.userId, type,
      description: new RegExp(`^${escapeRegex(description)}$`, "i"),
      category: { $nin: ["", null] },
    }).sort({ date: -1 }).select("category account").lean();
    if (last) return res.json({ category: last.category, account: last.account ? String(last.account) : "", source: "history" });

    const rules = prepareRules(await Rule.find({ user: req.userId }).lean());
    const s = suggestCategory(description, type, rules);
    res.json(s.category ? { category: s.category, source: s.source } : {});
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.get("/search", async (req, res) => {
  try {
    const { and, match } = buildMatch(req.query, req.userId);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 20));
    const total = await Transaction.countDocuments(match);
    const pages = Math.ceil(total / pageSize);
    const page = Math.min(Math.max(1, parseInt(req.query.page, 10) || 1), Math.max(1, pages));

    const items = await Transaction.find(match)
      .sort({ date: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .populate("account", "name type")
      .populate("toAccount", "name type");

    const sums = await Transaction.aggregate([
      { $match: match },
      { $group: { _id: "$type", total: { $sum: "$amount" } } },
    ]);
    const totals = {
      income: r2(sums.find((s) => s._id === "income")?.total || 0),
      expenses: r2(sums.find((s) => s._id === "expense")?.total || 0), // transfers aren't counted
    };

    // Full-day totals for the days on this page, so a day split across two pages still adds up
    const daily = {};
    if (items.length) {
      const dayStart = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      const rows = await Transaction.aggregate([
        { $match: { $and: [...and, { date: { $gte: dayStart(items[items.length - 1].date), $lt: new Date(dayStart(items[0].date).getTime() + 86400000) } }] } },
        { $group: { _id: { d: { $dateToString: { format: "%Y-%m-%d", date: "$date" } }, t: "$type" }, total: { $sum: "$amount" } } },
      ]);
      for (const r of rows) {
        const day = (daily[r._id.d] ||= { income: 0, expenses: 0 });
        if (r._id.t === "income") day.income = r2(r.total);
        else if (r._id.t === "expense") day.expenses = r2(r.total);
      }
    }

    res.json({ items, total, page, pageSize, pages, totals, daily });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// CSV of whatever the filters currently show
const cell = (v) => {
  if (v === null || v === undefined) return "";
  let s;
  if (v instanceof Date) s = v.toISOString().slice(0, 16).replace("T", " ");
  else if (typeof v === "number") s = v.toFixed(2);
  else {
    s = String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stops Excel running text as a formula
  }
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

router.get("/export", async (req, res) => {
  try {
    const { match } = buildMatch(req.query, req.userId);
    const txs = await Transaction.find(match).sort({ date: -1, createdAt: -1 }).limit(5000)
      .populate("account", "name").populate("toAccount", "name").lean();
    const head = ["Date", "Type", "Category", "Description", "Account", "To account", "Amount", "Fee", "Mood", "Tags", "Notes"];
    const rows = txs.map((t) => [
      t.date, t.type, t.category, t.description, t.account?.name, t.toAccount?.name,
      t.amount, t.fee || 0, t.mood, (t.tags || []).join(" "), t.notes,
    ]);
    const body = "\uFEFF" + [head, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="pocketwise-transactions-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(body);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Overview numbers. Transfers aren't income or expense, but transfer FEES are expenses.
// "saved" is the money moved into (or out of) savings goals in the same period.
router.get("/summary", async (req, res) => {
  const match = { user: new mongoose.Types.ObjectId(req.userId) };
  const m = /^(\d{4})-(\d{2})$/.exec(req.query.month || "");
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    match.date = { $gte: new Date(Date.UTC(y, mo, 1)), $lt: new Date(Date.UTC(y, mo + 1, 1)) };
  } else if (req.query.period === "week") match.date = { $gte: addDays(startOfToday(), -6) };
  else if (req.query.period === "month") match.date = { $gte: startOfThisMonth() };

  const byType = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: "$type", total: { $sum: "$amount" } } },
  ]);
  const byCategory = await Transaction.aggregate([
    { $match: { ...match, type: "expense" } },
    { $project: { parts: { $cond: [{ $gt: [{ $size: { $ifNull: ["$splits", []] } }, 0] }, "$splits", [{ category: "$category", amount: "$amount" }] ] } } },
    { $unwind: "$parts" },
    { $group: { _id: "$parts.category", total: { $sum: "$parts.amount" } } },
  ]);
  const fees = await Transaction.aggregate([
    { $match: { ...match, type: "transfer", fee: { $gt: 0 } } },
    { $group: { _id: null, total: { $sum: "$fee" } } },
  ]);
  const goalMoves = await Transaction.aggregate([
    { $match: { ...match, type: "transfer", goal: { $ne: null } } },
    { $group: { _id: { $cond: [{ $ne: ["$account", null] }, "in", "out"] }, total: { $sum: "$amount" } } },
  ]);

  const feeTotal = fees[0]?.total || 0;
  if (feeTotal > 0) byCategory.push({ _id: "Transfer Fees", total: r2(feeTotal) });

  const income = byType.find((t) => t._id === "income")?.total || 0;
  const expenses = r2((byType.find((t) => t._id === "expense")?.total || 0) + feeTotal);
  const saved = r2((goalMoves.find((g) => g._id === "in")?.total || 0) - (goalMoves.find((g) => g._id === "out")?.total || 0));
  res.json({ income, expenses, balance: r2(income - expenses), saved, byCategory });
});

router.post("/bulk-delete", async (req, res) => {
  try {
    const ids = (Array.isArray(req.body.ids) ? req.body.ids : []).filter(isId).slice(0, 200);
    if (!ids.length) return res.status(400).json({ message: "Select at least one transaction" });
    let deleted = 0;
    for (const id of ids) if (await deleteTx(req.userId, id)) deleted++;
    res.json({ deleted });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const { error, data } = await buildPayload(req.body, req.userId);
    if (error) return res.status(400).json({ message: error });
    const tx = await Transaction.create({ ...data, user: req.userId });
    const autoSaved = tx.type === "income" ? await applyAutoSave(tx) : 0;
    res.status(201).json(withAuto(tx, autoSaved));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const existing = await Transaction.findOne({ _id: req.params.id, user: req.userId });
    if (!existing) return res.status(404).json({ message: "That transaction wasn't found" });
    if (existing.goal)
      return res.status(400).json({ message: "Savings entries can't be edited. Delete it and add it again." });

    const { error, data } = await buildPayload(req.body, req.userId);
    if (error) return res.status(400).json({ message: error });

    const tx = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      data,
      { new: true, runValidators: true }
    );
    // The income may have changed (amount, account or type), so redo its automatic savings
    await reverseAutoSave(req.userId, tx._id);
    const autoSaved = tx.type === "income" ? await applyAutoSave(tx) : 0;
    res.json(withAuto(tx, autoSaved));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.patch("/:id/mood", async (req, res) => {
  try {
    if (!MOOD_KEYS.includes(req.body.mood)) return res.status(400).json({ message: "Choose a valid mood." });
    const tx = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.userId, type: { $ne: "transfer" } },
      { mood: req.body.mood },
      { new: true, runValidators: true }
    );
    if (!tx) return res.status(404).json({ message: "Transaction not found" });
    res.json(tx);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const tx = await deleteTx(req.userId, req.params.id);
    if (!tx) return res.status(404).json({ message: "That transaction wasn't found" });
    res.json({ message: "Deleted" });
  } catch {
    res.status(404).json({ message: "That transaction wasn't found" });
  }
});

/* ---------- Receipt photo (resized to a small JPEG in the browser first) ---------- */

router.get("/:id/receipt", async (req, res) => {
  try {
    const tx = await Transaction.findOne({ _id: req.params.id, user: req.userId }).select("+receipt");
    if (!tx || !tx.receipt) return res.status(404).json({ message: "There's no receipt photo on this transaction" });
    res.json({ image: tx.receipt });
  } catch {
    res.status(404).json({ message: "There's no receipt photo on this transaction" });
  }
});

router.put("/:id/receipt", async (req, res) => {
  try {
    const image = req.body.image;
    if (typeof image !== "string" || !image.startsWith("data:image/jpeg;base64,"))
      return res.status(400).json({ message: "Use a JPG or PNG photo" });
    if (image.length > 1_500_000) return res.status(400).json({ message: "That photo is too large. Try a smaller one." });
    const tx = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { receipt: image, hasReceipt: true }
    ).select("_id");
    if (!tx) return res.status(404).json({ message: "That transaction wasn't found" });
    res.json({ ok: true });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id/receipt", async (req, res) => {
  try {
    const tx = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { $unset: { receipt: 1 }, hasReceipt: false }
    ).select("_id");
    if (!tx) return res.status(404).json({ message: "That transaction wasn't found" });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ message: "That transaction wasn't found" });
  }
});

export default router;