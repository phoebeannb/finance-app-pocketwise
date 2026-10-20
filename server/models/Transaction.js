import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["income", "expense", "transfer"], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  fee: { type: Number, default: 0, min: 0 },
  category: String,
  description: String,
  mood: { type: String, default: "" },
  date: { type: Date, default: Date.now },
  account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
  toAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
  goal: { type: mongoose.Schema.Types.ObjectId, ref: "Goal", default: null },
  // The income that caused this automatic saving (so deleting the income can undo it)
  autoFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", default: null },
  // Set only when a bill/subscription created this entry
  recurring: { type: mongoose.Schema.Types.ObjectId, ref: "Recurring", default: null },
  occurrence: { type: Date, default: null },
}, { timestamps: true });

transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ autoFrom: 1 });

// One bill can only ever post once per due date, even if the job runs twice or the server restarts mid-run
transactionSchema.index(
  { recurring: 1, occurrence: 1 },
  { unique: true, partialFilterExpression: { recurring: { $type: "objectId" } } }
);

export default mongoose.model("Transaction", transactionSchema);