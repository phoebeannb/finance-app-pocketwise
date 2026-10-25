import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["income", "expense", "transfer"], required: true },
  amount: { type: Number, required: true, min: 0.01 },
  fee: { type: Number, default: 0, min: 0 },
  category: String,
  splits: {
    type: [{
      category: { type: String, required: true, trim: true, maxlength: 60 },
      amount: { type: Number, required: true, min: 0.01 },
    }],
    default: undefined,
  },
  description: String,
  notes: { type: String, default: "" },
  tags: { type: [String], default: [] },
  mood: { type: String, default: "" },
  hasReceipt: { type: Boolean, default: false },
  receipt: { type: String, select: false }, // the photo itself. Only loaded when asked for.
  date: { type: Date, default: Date.now },
  account: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
  toAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
  goal: { type: mongoose.Schema.Types.ObjectId, ref: "Goal", default: null },
  autoFrom: { type: mongoose.Schema.Types.ObjectId, ref: "Transaction", default: null },
  manualSave: { type: Boolean, default: false },
  recurring: { type: mongoose.Schema.Types.ObjectId, ref: "Recurring", default: null },
  occurrence: { type: Date, default: null },
}, { timestamps: true });

transactionSchema.index({ user: 1, date: -1 });
transactionSchema.index({ autoFrom: 1 });
transactionSchema.index(
  { recurring: 1, occurrence: 1 },
  { unique: true, partialFilterExpression: { recurring: { $type: "objectId" } } }
);

export default mongoose.model("Transaction", transactionSchema);