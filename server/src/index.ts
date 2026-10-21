import cors from "cors";
import express from "express";
import { db } from "./prisma/db.js";

const app = express();

const PORT = 5000;

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

app.use(express.json());

app.get("/", (_req, res) => {
  res.send("SkillSwap API is running");
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "SkillSwap API is healthy",
  });
});

app.get("/api/test-db", async (_req, res) => {
  try {
    const result = db.raw;
    res.json({
      success: true,
      message: "Database query executed",
      result,
    });
  } catch (error) {
    console.error("Database test failed:", error);

    res.status(500).json({
      success: false,
      message: "Database connection or query failed",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});