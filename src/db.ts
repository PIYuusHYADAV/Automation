import { Pool } from "pg";
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";
dotenv.config();
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
export const db = drizzle(pool, { schema });
export const connectDB = async () => {
  try {
    const client = await pool.connect();
    console.log(" PostgreSQL connected");
    client.release();
  } catch (error) {
    console.error(" Database connection failed:", error);
    process.exit(1);
  }
};
