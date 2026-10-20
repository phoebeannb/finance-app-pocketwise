import mongoose from "mongoose";

const goalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  name: { type: String, required: true, trim: true, maxlength: 60 },
  target: { type: Number, required: true, min: 1 },
  saved: { type: Number, default: 0, min: 0 },
  deadline: { type: Date, default: null },
  autoPercent: { type: Number, default: 0, min: 0, max: 100 }, // share of every income that moves in
}, { timestamps: true });

export default mongoose.model("Goal", goalSchema);