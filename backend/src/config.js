import dotenv from "dotenv";

dotenv.config();

function readBool(name, fallback = false) {
  const value = process.env[name];
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function readInt(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  appName: process.env.APP_NAME || "fortune-order-assistant",
  appBaseUrl: required("APP_BASE_URL"),
  port: readInt("PORT", 3000),
  adminUsername: process.env.ADMIN_USERNAME || "admin",
  adminPasswordHash: required("ADMIN_PASSWORD_HASH"),
  sessionSecret: required("SESSION_SECRET"),
  databaseUrl: required("DATABASE_URL"),
  sqliteWalEnabled: readBool("SQLITE_WAL_ENABLED", true),
  sqliteBusyTimeoutMs: readInt("SQLITE_BUSY_TIMEOUT_MS", 5000),
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  logDir: process.env.LOG_DIR || "./logs",
  backupDir: process.env.BACKUP_DIR || "./backups",
  securityCodePepper: required("SECURITY_CODE_PEPPER"),
  defaultClientMode: process.env.DEFAULT_CLIENT_MODE || "standalone",
  defaultDeviceLimit: readInt("DEFAULT_DEVICE_LIMIT", 1),
  websocketEnabled: readBool("WEBSOCKET_ENABLED", false),
  websocketPath: process.env.WEBSOCKET_PATH || "/ws",
  lotteryApiBaseUrl: process.env.LOTTERY_API_BASE_URL || ""
};
