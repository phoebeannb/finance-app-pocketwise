import express from "express";
import Category from "../models/Category.js";
import auth from "../middleware/auth.js";

const router = express.Router();
router.use(auth);

router.get("/", async (req, res) => {
  res.json(await Category.find({ user: req.userId }).sort({ createdAt: 1 }));
});

router.post("/", async (req, res) => {
  try {
    const name = (req.body.name || "").toString().trim().replace(/\s+/g, " ");
    const type = req.body.type;
    if (!name) return res.status(400).json({ message: "Enter a category name" });
    if (!["expense", "income"].includes(type)) return res.status(400).json({ message: "Invalid category type" });

    const category = await Category.create({ user: req.userId, name, key: name.toLowerCase(), type });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ message: "That category already exists" });
    res.status(400).json({ message: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const category = await Category.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!category) return res.status(404).json({ message: "Not found" });
    res.json({ message: "Deleted" });
  } catch {
    res.status(404).json({ message: "Not found" });
  }
});

export default router;