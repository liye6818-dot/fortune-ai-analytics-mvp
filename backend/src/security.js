import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { config } from "./config.js";

export function nowIso() {
  return new Date().toISOString();
}

export function makeId(prefix) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "")}`;
}

export function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function randomAccessCode(prefix) {
  let body = "";
  while (body.length < 12) {
    body += crypto.randomBytes(9).toString("base64url").toUpperCase().replace(/[^A-Z0-9]/g, "");
  }
  body = body.slice(0, 12);
  return `${prefix}${body.slice(0, 4)}-${body.slice(4, 8)}-${body.slice(8, 12)}`;
}

export function sha256(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function normalizeAccessCode(code) {
  return String(code || "").trim().toUpperCase().replace(/\s+/g, "");
}

export function hashSecurityCode(code) {
  return sha256(`${config.securityCodePepper}|${normalizeAccessCode(code)}`);
}

export function hashStandaloneKey(key) {
  return sha256(`${config.securityCodePepper}|standalone|${normalizeAccessCode(key)}`);
}

export function hashSessionToken(token) {
  return sha256(`${config.sessionSecret}|${String(token || "")}`);
}

export function codePreview(code) {
  const normalized = String(code || "").trim();
  if (normalized.length <= 8) return normalized;
  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
}

export function addDays(days) {
  return new Date(Date.now() + Number(days) * 86400000).toISOString();
}

export function expiryFromDuration(duration, customExpiresAt) {
  if (duration === "permanent") return { permanent: 1, expiresAt: null };
  if (duration === "custom") {
    if (!customExpiresAt) throw Object.assign(new Error("custom_expiry_required"), { statusCode: 400 });
    return { permanent: 0, expiresAt: new Date(customExpiresAt).toISOString() };
  }
  const days = Number(duration);
  if (![30, 90, 180, 365].includes(days)) throw Object.assign(new Error("invalid_duration"), { statusCode: 400 });
  return { permanent: 0, expiresAt: addDays(days) };
}

export function isExpired(row) {
  return !row?.permanent && row?.expires_at && Date.now() > new Date(row.expires_at).getTime();
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(String(password || ""), passwordHash);
}

export async function hashPassword(password) {
  return bcrypt.hash(String(password), 12);
}
