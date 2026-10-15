import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true, maxlength: 30 },
  key: { type: String, required: true }, // lowercase copy, so "food" and "Food" count as the same
  type: { type: String, enum: ["expense", "income"], required: true },
}, { timestamps: true });

categorySchema.index({ user: 1, type: 1, key: 1 }, { unique: true });

export default mongoose.model("Category", categorySchema);