import express from "express";
import type { NextFunction, Request, Response } from "express";

import cors from "cors";
import dotenv from "dotenv";
import { connectMongo } from "./src/utils/mongo";
import { connectPostgres } from "./src/utils/postgres";

dotenv.config();
connectMongo();
connectPostgres();

const app = express();

app.use(cors());
app.use(express.json());

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

app.get("/health", (_, res) => {
  res.json({ ok: true });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("API running on 5000");
});
