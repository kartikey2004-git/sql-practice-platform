import pkg from "pg";
import "dotenv/config";

const { Pool } = pkg;

export const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

export const connectPostgres = async () => {
  await pool.connect();
  console.log("Postgres connected");
};