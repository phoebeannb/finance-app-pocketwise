import mongoose from "mongoose";

const investmentEntrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", required: true },
  type: { type: String, enum: ["contribution", "withdrawal", "valuation"], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  date: { type: Date, default: Date.now },
  note: { type: String, trim: true, maxlength: 200, default: "" },
}, { timestamps: true });

investmentEntrySchema.index({ user: 1, account: 1, date: -1 });

export default mongoose.model("InvestmentEntry", investmentEntrySchema);
