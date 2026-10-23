import mongoose from "mongoose";

const sharedGroupSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 80 },
  code: { type: String, required: true, unique: true, uppercase: true, index: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
}, { timestamps: true });

export default mongoose.model("SharedGroup", sharedGroupSchema);
