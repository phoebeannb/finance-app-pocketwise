import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["income", "expense", "transfer"], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  category: String,
  description: String,
  date: { type: Date, default: Date.now },
  account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
  toAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
}, { timestamps: true });

transactionSchema.index({ user: 1, date: -1 });

export default mongoose.model("Transaction", transactionSchema);