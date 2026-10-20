import cron from "node-cron";
import Recurring from "../models/Recurring.js";
import Transaction from "../models/Transaction.js";
import Account from "../models/Account.js";
import { startOfToday } from "./dates.js";
import { applyAutoSave } from "./autosave.js";

const DAY = 86400000;
const MAX_CATCHUP = 120; // most missed due dates posted for one item in one run
const daysIn = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

export function nextOccurrence(date, cadence, anchorDay) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  if (cadence === "weekly") return new Date(date.getTime() + 7 * DAY);
  if (cadence === "yearly") return new Date(Date.UTC(y + 1, m, Math.min(anchorDay, daysIn(y + 1, m))));
  const ny = m === 11 ? y + 1 : y;
  const nm = (m + 1) % 12;
  return new Date(Date.UTC(ny, nm, Math.min(anchorDay, daysIn(ny, nm))));
}

// Used when resuming a paused item: jump forward without posting what was missed while paused
export function firstOnOrAfter(date, cadence, anchorDay, today) {
  let d = date;
  for (let i = 0; i < 2000 && d.getTime() < today.getTime(); i++) d = nextOccurrence(d, cadence, anchorDay);
  return d;
}

/*
  Posts every bill that is due. Safe to run any number of times:
  1. The transaction is inserted first. The unique index on (recurring, occurrence) rejects a second
     insert for the same due date, so a double run or a crash and restart can't create a duplicate.
  2. Only then is nextDate moved forward, with a condition ("only if it still equals this due date").
  If the server dies between 1 and 2, the next run skips the insert and finishes step 2.
  Auto-saving for income is also safe to repeat (each goal gets its share once per income).
*/
export async function processDue(filter = {}) {
  const today = startOfToday();
  const due = await Recurring.find({ ...filter, active: true, nextDate: { $lte: today } });
  let created = 0;

  for (const item of due) {
    const accountId = item.account && (await Account.exists({ _id: item.account, user: item.user })) ? item.account : null;
    let occ = item.nextDate;

    for (let i = 0; i < MAX_CATCHUP && occ.getTime() <= today.getTime(); i++) {
      let tx = null;
      try {
        tx = await Transaction.create({
          user: item.user,
          type: item.type,
          amount: item.amount,
          category: item.category,
          description: item.name,
          date: occ,
          account: accountId,
          recurring: item._id,
          occurrence: occ,
        });
        created++;
      } catch (err) {
        if (err.code !== 11000) throw err; // 11000 = already posted for this date, which is fine
        tx = await Transaction.findOne({ recurring: item._id, occurrence: occ });
      }
      if (tx && tx.type === "income") await applyAutoSave(tx);

      const next = nextOccurrence(occ, item.cadence, item.anchorDay);
      const res = await Recurring.updateOne({ _id: item._id, nextDate: occ }, { $set: { nextDate: next, lastPosted: occ } });
      if (res.modifiedCount === 0) break; // someone else already moved it on
      occ = next;
    }
  }
  return created;
}

export function startScheduler() {
  let running = false;
  const run = async (why) => {
    if (running) return; // never overlap with a run that's still going
    running = true;
    try {
      const n = await processDue();
      if (n > 0) console.log(`Recurring: posted ${n} transaction${n === 1 ? "" : "s"} (${why})`);
    } catch (err) {
      console.error("Recurring job failed:", err.message);
    } finally {
      running = false;
    }
  };

  run("startup"); // catches up on anything missed while the server was off
  cron.schedule("5 * * * *", () => run("hourly")); // hourly, so a sleeping laptop at midnight still catches up
}