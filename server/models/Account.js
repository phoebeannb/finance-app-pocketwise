import mongoose from "mongoose";

export const ACCOUNT_TYPES = ["Bank Account", "Credit Card", "Loan", "Investment", "Asset", "Other"];

const accountSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  type: { type: String, enum: ACCOUNT_TYPES, required: true },
  provider: { type: String, trim: true, maxlength: 80 },
  balance: { type: Number, default: 0 }, // starting balance
  notes: { type: String, trim: true, maxlength: 200 },
}, { timestamps: true });

export default mongoose.model("Account", accountSchema);