import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["income", "expense", "transfer"], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  fee: { type: Number, default: 0, min: 0 }, // transfer fee, taken from the source account
  category: String,
  description: String,
  date: { type: Date, default: Date.now },
  account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
  toAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
  goal: { type: mongoose.Schema.Types.ObjectId, ref: "Goal", default: null }, // set for savings deposits/withdrawals
}, { timestamps: true });

transactionSchema.index({ user: 1, date: -1 });

export default mongoose.model("Transaction", transactionSchema);