import mongoose from "mongoose";

const debtSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  group: { type: mongoose.Schema.Types.ObjectId, ref: "SharedGroup", default: null },
  kind: { type: String, enum: ["debt", "shared"], default: "debt" },
  direction: { type: String, enum: ["owed_to_me", "i_owe"], required: true },
  person: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, required: true, trim: true, maxlength: 160 },
  total: { type: Number, required: true, min: 0.01 },
  amountOwed: { type: Number, required: true, min: 0 },
  dueDate: { type: Date, default: null },
  date: { type: Date, default: Date.now },
  status: { type: String, enum: ["open", "settled"], default: "open" },
  notes: { type: String, trim: true, maxlength: 300, default: "" },
  payments: [{
    amount: { type: Number, required: true, min: 0.01 },
    date: { type: Date, default: Date.now },
    note: { type: String, trim: true, maxlength: 160, default: "" },
  }],
}, { timestamps: true });

debtSchema.index({ user: 1, status: 1, createdAt: -1 });

export default mongoose.model("Debt", debtSchema);
