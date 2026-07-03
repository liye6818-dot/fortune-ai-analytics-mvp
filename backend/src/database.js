import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { config } from "./config.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..", "..");

function sqlitePathFromUrl(databaseUrl) {
  if (!databaseUrl.startsWith("sqlite:")) {
    throw new Error("Only sqlite: DATABASE_URL is supported in phase 1");
  }
  const rawPath = databaseUrl.replace(/^sqlite:/, "");
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(projectRoot, rawPath);
}

export function openDatabase() {
  const dbPath = sqlitePathFromUrl(config.databaseUrl);
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma(`busy_timeout = ${config.sqliteBusyTimeoutMs}`);
  db.pragma("foreign_keys = ON");
  if (config.sqliteWalEnabled) {
    db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
  }
  const schemaPath = path.resolve(projectRoot, "database", "schema.sql");
  db.exec(fs.readFileSync(schemaPath, "utf8"));
  return db;
}

export function withTransaction(db, fn) {
  return db.transaction(fn)();
}
