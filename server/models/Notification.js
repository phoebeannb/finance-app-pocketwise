import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  sourceKey: { type: String, required: true },
  title: { type: String, required: true, maxlength: 160 },
  detail: { type: String, default: "", maxlength: 300 },
  tone: { type: String, enum: ["red", "amber", "indigo", "green"], default: "indigo" },
  to: { type: String, default: "/" },
  readAt: { type: Date, default: null },
  active: { type: Boolean, default: true },
}, { timestamps: true });

notificationSchema.index({ user: 1, sourceKey: 1 }, { unique: true });
notificationSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);
