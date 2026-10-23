import mongoose from "mongoose";

const deletedItemSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["transaction", "account", "bill", "budget", "goal", "debt"], required: true },
  originalId: { type: mongoose.Schema.Types.ObjectId, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  deletedAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 },
}, { timestamps: true });

deletedItemSchema.index({ user: 1, deletedAt: -1 });

export default mongoose.model("DeletedItem", deletedItemSchema);
