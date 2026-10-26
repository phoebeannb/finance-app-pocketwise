import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  profilePhoto: { type: String, default: "" },
  password: { type: String, required: true },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  demoLoaded: { type: Boolean, default: false },
  preferences: {
    currency: { type: String, default: "PHP" },
    dateFormat: { type: String, default: "medium" },
    defaultAccount: { type: mongoose.Schema.Types.ObjectId, ref: "Account", default: null },
    reportRange: { type: Number, enum: [6, 12], default: 6 },
    theme: { type: String, enum: ["light", "dark"], default: "light" },
    accent: { type: String, enum: ["indigo", "emerald", "rose", "amber"], default: "indigo" },
    iconStyle: { type: String, enum: ["classic", "colorful"], default: "classic" },
  },
}, { timestamps: true });

export default mongoose.model("User", userSchema);