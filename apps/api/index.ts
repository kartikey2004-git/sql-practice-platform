import express from "express";
import type { NextFunction, Request, Response } from "express";

import cors from "cors";
import dotenv from "dotenv";
import { connectMongo } from "./src/utils/mongo";
import { connectPostgres } from "./src/utils/postgres";
import { ApiError } from "./utils/ApiError";
import assignmentRoutes from "./routes/assignment.routes";
import sandboxRoutes from "./routes/sandbox.routes";

dotenv.config();
connectMongo();
connectPostgres();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_, res) => {
  res.json({ ok: true });
});

app.use("/assignments", assignmentRoutes);
app.use("/sandbox", sandboxRoutes);

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: err.success,
      message: err.message,
      data: err.data,
      errors: err.errors,
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: "Internal server error",
    data: null,
    errors: [],
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("API running on 5000");
});
