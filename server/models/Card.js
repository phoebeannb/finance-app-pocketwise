import mongoose from "mongoose";

const cardSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  nickname: { type: String, required: true, trim: true, maxlength: 40 },
  issuer: { type: String, trim: true, maxlength: 80 },
  network: { type: String, enum: ["Visa", "Mastercard", "JCB", "American Express", "Other"], default: "Visa" },
  kind: { type: String, enum: ["Credit", "Debit"], default: "Credit" },
  last4: { type: String, match: /^\d{4}$/ },
  dueDay: { type: Number, min: 1, max: 31, default: null },
  creditLimit: { type: Number, min: 0, default: null },
}, { timestamps: true });

export default mongoose.model("Card", cardSchema);