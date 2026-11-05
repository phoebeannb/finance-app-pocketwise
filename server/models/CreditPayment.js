import mongoose from "mongoose";

const creditPaymentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  card: { type: mongoose.Schema.Types.ObjectId, ref: "Card", required: true },
  amount: { type: Number, required: true, min: 0.01 },
  date: { type: Date, default: Date.now },
  note: { type: String, trim: true, maxlength: 200, default: "" },
}, { timestamps: true });

creditPaymentSchema.index({ user: 1, card: 1, date: -1 });

export default mongoose.model("CreditPayment", creditPaymentSchema);
