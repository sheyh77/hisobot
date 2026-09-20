import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
const usesRenderDatabase = databaseUrl?.includes("render.com") || databaseUrl?.includes("dpg-");
export const pool = new Pool({
	connectionString: databaseUrl,
	ssl: usesRenderDatabase || process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});
pool.on("error", (error) => console.error("Database pool error:", error.message));
