import express from "express";
import mongoose from "mongoose";
import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";
import Rule from "../models/Rule.js";
import auth from "../middleware/auth.js";
import { norm, prepareRules, suggestCategory } from "../utils/autoCategory.js";

const router = express.Router();
router.use(auth);

const MAX_ROWS = 1000;
const DAY = 86400000;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/;
const r2 = (n) => Math.round(n * 100) / 100;
const dupKey = (type, ymd, amount, description) =>
  `${type}|${ymd}|${r2(Number(amount)).toFixed(2)}|${String(description || "").trim().toLowerCase()}`;

// Everything already saved in the same date range, as "date|amount|description" keys
async function existingKeys(userId, dates) {
  const times = dates.map((d) => new Date(d).getTime()).filter(Number.isFinite);
  if (!times.length) return new Set();
  const from = new Date(Math.floor(Math.min(...times) / DAY) * DAY);
  const to = new Date(Math.floor(Math.max(...times) / DAY) * DAY + DAY);
  const txs = await Transaction.find({
    user: userId,
    type: { $in: ["income", "expense"] },
    date: { $gte: from, $lt: to },
  }).select("type amount description date").lean();
  return new Set(txs.map((t) => dupKey(t.type, t.date.toISOString().slice(0, 10), t.amount, t.description)));
}

// Fill in a category for each row (the file's own category wins) and flag duplicates
router.post("/suggest", async (req, res) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows.slice(0, MAX_ROWS) : [];
    const rules = prepareRules(await Rule.find({ user: req.userId }).lean());
    const keys = await existingKeys(req.userId, rows.map((r) => r.date));

    const suggestions = rows.map((r) => {
      const given = String(r.category || "").trim().slice(0, 60);
      const s = given ? { category: given, source: "file" } : suggestCategory(r.description, r.type, rules);
      const ymd = String(r.date || "").slice(0, 10);
      return { category: s.category, source: s.source, duplicate: keys.has(dupKey(r.type, ymd, r.amount, r.description)) };
    });
    res.json({ suggestions });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Save the chosen rows, and any rules the person wants remembered
router.post("/commit", async (req, res) => {
  try {
    const rows = Array.isArray(req.body.rows) ? req.body.rows : [];
    if (!rows.length) return res.status(400).json({ message: "Nothing to import. Select at least one row." });
    if (rows.length > MAX_ROWS) return res.status(400).json({ message: `Import up to ${MAX_ROWS} rows at a time. Split the file by month.` });

    // The account used when a row doesn't name one
    let defaultAccount = null;
    if (req.body.account) {
      if (!mongoose.isValidObjectId(req.body.account)) return res.status(400).json({ message: "That account isn't valid. Choose one from the list" });
      const acc = await Account.findOne({ _id: req.body.account, user: req.userId });
      if (!acc) return res.status(400).json({ message: "That account wasn't found. It may have been deleted" });
      defaultAccount = acc._id;
    }

    // Accounts named on individual rows must belong to this user
    const rowIds = [...new Set(rows.map((r) => r.account).filter((id) => id && mongoose.isValidObjectId(id)))];
    const owned = new Set(
      (await Account.find({ _id: { $in: rowIds }, user: req.userId }).select("_id").lean()).map((a) => String(a._id))
    );

    const valid = [];
    let invalid = 0;
    for (const r of rows) {
      const amount = Number(r.amount);
      const ok =
        ["income", "expense"].includes(r.type) &&
        Number.isFinite(amount) && amount > 0 && amount < 1e9 &&
        ISO.test(r.date || "") && !Number.isNaN(new Date(r.date).getTime());
      if (!ok) { invalid++; continue; }
      valid.push({
        type: r.type,
        amount: r2(amount),
        date: new Date(r.date),
        ymd: r.date.slice(0, 10),
        category: String(r.category || "").trim().slice(0, 60),
        description: String(r.description || "").trim().slice(0, 200),
        account: r.account && owned.has(String(r.account)) ? r.account : defaultAccount,
        force: r.force === true, // the person deliberately kept a flagged duplicate
      });
    }

    const keys = await existingKeys(req.userId, valid.map((v) => v.date));
    const toInsert = [];
    let skippedDuplicates = 0;
    for (const v of valid) {
      if (!v.force && keys.has(dupKey(v.type, v.ymd, v.amount, v.description))) { skippedDuplicates++; continue; }
      toInsert.push({
        user: req.userId, type: v.type, amount: v.amount, category: v.category,
        description: v.description, date: v.date, account: v.account,
      });
    }
    if (toInsert.length) await Transaction.insertMany(toInsert, { ordered: false });

    const ops = [];
    for (const r of Array.isArray(req.body.remember) ? req.body.remember.slice(0, 200) : []) {
      const keyword = norm(r.keyword).trim();
      const category = String(r.category || "").trim().slice(0, 60);
      if (!["income", "expense"].includes(r.type) || keyword.length < 3 || keyword.length > 40 || !category) continue;
      ops.push({
        updateOne: {
          filter: { user: new mongoose.Types.ObjectId(req.userId), type: r.type, keyword },
          update: { $set: { category } },
          upsert: true,
        },
      });
    }
    if (ops.length) await Rule.bulkWrite(ops);

    res.json({ imported: toInsert.length, skippedDuplicates, invalid, rulesSaved: ops.length });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;