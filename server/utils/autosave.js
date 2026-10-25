import Goal from "../models/Goal.js";
import Account from "../models/Account.js";
import Transaction from "../models/Transaction.js";

const LIABILITIES = ["Credit Card", "Loan"];
const r2 = (n) => Math.round(n * 100) / 100;

/*
  When income lands in an account you own, move each goal's share into it.
  Safe to run twice for the same income: a goal that already got its share from this income is skipped.
  Returns the total moved. It never throws, so a problem here can't undo the income itself.
*/
export async function applyAutoSave(income) {
  if (!income || income.type !== "income" || !income.account) return 0;
  let total = 0;
  try {
    const account = await Account.findOne({ _id: income.account, user: income.user }).select("type").lean();
    if (!account || LIABILITIES.includes(account.type)) return 0;

    const goals = await Goal.find({ user: income.user, autoPercent: { $gt: 0 } }).sort({ createdAt: 1 });
    for (const goal of goals) {
      const remaining = r2(goal.target - goal.saved);
      if (remaining <= 0) continue;
      const portion = Math.min(r2((income.amount * goal.autoPercent) / 100), remaining);
      if (portion < 0.01) continue;
      if (await Transaction.exists({ autoFrom: income._id, goal: goal._id })) continue;

      // Step 1: put the money in the goal (refused if it would overshoot the target)
      const bumped = await Goal.findOneAndUpdate(
        { _id: goal._id, $expr: { $lte: [{ $add: ["$saved", portion] }, { $add: ["$target", 0.005] }] } },
        { $inc: { saved: portion } }
      );
      if (!bumped) continue;

      // Step 2: record it against the account. If that fails, take the money back out of the goal.
      try {
        await Transaction.create({
          user: income.user,
          type: "transfer",
          amount: portion,
          category: "Savings",
          description: `Auto-saved ${goal.autoPercent}% of income to ${goal.name}`,
          date: income.date,
          goal: goal._id,
          account: income.account,
          toAccount: null,
          autoFrom: income._id,
          manualSave: true,
        });
        total = r2(total + portion);
      } catch (err) {
        await Goal.updateOne({ _id: goal._id }, { $inc: { saved: -portion } });
        console.error("Auto-save failed:", err.message);
      }
    }
  } catch (err) {
    console.error("Auto-save failed:", err.message);
  }
  return total;
}

// Undo the automatic savings that came from one income (used when the income is edited or deleted)
export async function reverseAutoSave(userId, incomeId) {
  try {
    const parts = await Transaction.find({ user: userId, autoFrom: incomeId });
    for (const p of parts) {
      await Transaction.deleteOne({ _id: p._id });
      const goal = p.goal ? await Goal.findOne({ _id: p.goal, user: userId }) : null;
      if (goal) {
        goal.saved = Math.max(0, r2(goal.saved - p.amount));
        await goal.save();
      }
    }

  } catch (err) {
    console.error("Undoing auto-save failed:", err.message);
  }
}

export async function validateManualSave(income, goalId, amount) {
  const portion = r2(Number(amount));
  if (!goalId && !amount) return null;
  if (!goalId) return "Choose a savings goal or clear the contribution amount";
  if (!Number.isFinite(portion) || portion <= 0) return "Enter a goal contribution greater than 0";
  if (portion > income.amount) return "The goal contribution cannot be greater than this income";
  const goal = await Goal.findOne({ _id: goalId, user: income.user });
  if (!goal) return "That savings goal wasn't found";
  if (portion > r2(goal.target - goal.saved) + 0.005) return "That contribution would exceed the goal target";
  const account = await Account.findOne({ _id: income.account, user: income.user }).select("balance type").lean();
  if (!account) return "That account wasn't found";
  const accountTransactions = await Transaction.find({
    user: income.user,
    $or: [{ account: income.account }, { toAccount: income.account }],
  }).select("type amount fee account toAccount").lean();
  let current = account.balance;
  for (const tx of accountTransactions) {
    if (tx.type === "income") current += tx.amount;
    else if (tx.type === "expense") current -= tx.amount;
    else if (tx.type === "transfer") {
      if (String(tx.account) === String(income.account)) current -= tx.amount + (tx.fee || 0);
      if (String(tx.toAccount) === String(income.account)) current += tx.amount;
    }
  }
  if (current + income.amount - portion < -0.005) return "This contribution would make the account balance negative";
  return null;
}

export async function applyManualSave(income, goalId, amount) {
  const error = await validateManualSave(income, goalId, amount);
  if (error) return { error };

  const portion = r2(Number(amount));
  const goal = await Goal.findOneAndUpdate(
    { _id: goalId, user: income.user, $expr: { $lte: [{ $add: ["$saved", portion] }, { $add: ["$target", 0.005] }] } },
    { $inc: { saved: portion } },
    { new: true }
  );
  if (!goal) return { error: "That contribution would exceed the goal target" };

  try {
    const tx = await Transaction.create({
      user: income.user,
      type: "transfer",
      amount: portion,
      category: "Savings",
      description: `Saved for ${goal.name}`,
      date: income.date,
      goal: goal._id,
      account: income.account,
      toAccount: null,
      autoFrom: income._id,
    });
    return { amount: portion, tx };
  } catch (err) {
    await Goal.updateOne({ _id: goal._id }, { $inc: { saved: -portion } });
    throw err;
  }
}