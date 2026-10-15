import mongoose from "mongoose";

const ruleSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["income", "expense"], required: true },
  keyword: { type: String, required: true }, // lowercase letters and spaces only, e.g. "jollibee sm"
  category: { type: String, required: true, maxlength: 60 },
}, { timestamps: true });

ruleSchema.index({ user: 1, type: 1, keyword: 1 }, { unique: true });

export default mongoose.model("Rule", ruleSchema);