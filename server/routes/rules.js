import express from "express";
import Rule from "../models/Rule.js";
import auth from "../middleware/auth.js";

const router = express.Router();
router.use(auth);

router.get("/", async (req, res) => {
  res.json(await Rule.find({ user: req.userId }).sort({ type: 1, keyword: 1 }));
});

router.delete("/:id", async (req, res) => {
  try {
    const rule = await Rule.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!rule) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch {
    res.status(404).json({ message: "Not found" });
  }
});

export default router;