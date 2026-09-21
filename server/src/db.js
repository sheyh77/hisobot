import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL;
const usesRenderDatabase = databaseUrl?.includes("render.com") || databaseUrl?.includes("dpg-");
export const pool = new Pool({
	connectionString: databaseUrl,
	ssl: usesRenderDatabase || process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
	max: Number(process.env.DB_POOL_MAX || 20),
	min: Number(process.env.DB_POOL_MIN || 2),
	connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000),
	idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
	query_timeout: Number(process.env.DB_QUERY_TIMEOUT_MS || 10000),
	statement_timeout: Number(process.env.DB_STATEMENT_TIMEOUT_MS || 10000),
});
pool.on("error", (error) => console.error("Database pool error:", error.message));
