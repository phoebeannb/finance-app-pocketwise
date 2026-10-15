import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.js";
import transactionRoutes from "./routes/transactions.js";
import accountRoutes from "./routes/accounts.js";
import budgetRoutes from "./routes/budgets.js";
import goalRoutes from "./routes/goals.js";
import reportRoutes from "./routes/reports.js";
import profileRoutes from "./routes/profile.js";
import cardRoutes from "./routes/cards.js";
import categoryRoutes from "./routes/categories.js";
import importRoutes from "./routes/importer.js";
import ruleRoutes from "./routes/rules.js";
import recurringRoutes from "./routes/recurring.js";
import Transaction from "./models/Transaction.js";
import { startScheduler } from "./utils/recurring.js";



dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/cards", cardRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/import", importRoutes);
app.use("/api/rules", ruleRoutes);
app.use("/api/recurring", recurringRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    await Transaction.init(); // make sure the "no double posting" index exists before anything runs
    app.listen(process.env.PORT, () => console.log("Server running"));
    startScheduler();
  })
  .catch(console.error);