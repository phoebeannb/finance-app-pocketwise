import mongoose from "mongoose";

const recurringSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  type: { type: String, enum: ["expense", "income"], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  category: { type: String, trim: true, maxlength: 60 },
  account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
  cadence: { type: String, enum: ["weekly", "monthly", "yearly"], required: true },
  anchorDay: { type: Number, min: 1, max: 31, required: true }, // keeps "the 31st" correct through short months
  nextDate: { type: Date, required: true },
  lastPosted: { type: Date, default: null },
  active: { type: Boolean, default: true },
  // How much value the person gets from this bill (the HCI "value rating")
  valueRating: { type: String, enum: ["high", "neutral", "unused"], default: "neutral" },
}, { timestamps: true });

recurringSchema.index({ active: 1, nextDate: 1 });

export default mongoose.model("Recurring", recurringSchema);