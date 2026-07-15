import express from "express";
import helmet from "helmet";
import { WebSocketServer } from "ws";
import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { openDatabase, withTransaction } from "./database.js";
import { writeAuditLog } from "./logger.js";
import { errorHandler, notFound, requireAdmin, requireClient } from "./middleware.js";
import {
  addDays,
  codePreview,
  expiryFromDuration,
  hashSecurityCode,
  hashStandaloneKey,
  hashSessionToken,
  isExpired,
  makeId,
  nowIso,
  randomAccessCode,
  randomToken,
  verifyPassword
} from "./security.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = openDatabase();
ensureStandaloneSessionColumn();
const app = express();
const server = createServer(app);
const projectSockets = new Map();
const loginAttempts = new Map();
const ONLINE_WINDOW_MS = 45000;

app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": ["'self'", "'unsafe-inline'"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "img-src": ["'self'", "data:"],
      "connect-src": ["'self'", "ws:", "wss:"]
    }
  }
}));
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  const origin = req.get("origin");
  const trustedOrigins = new Set([
    config.appBaseUrl,
    "https://caishenye88.com",
    "https://pwa.caishenye88.com",
    "https://online.caishenye88.com"
  ]);
  if (!origin || origin === "null" || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin) || trustedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "content-type, authorization, x-csrf-token");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use("/admin", express.static(path.resolve(__dirname, "..", "public", "admin")));

function rateLimit(key, limit = 10, windowMs = 60000) {
  const now = Date.now();
  const item = loginAttempts.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > item.resetAt) {
    item.count = 0;
    item.resetAt = now + windowMs;
  }
  item.count += 1;
  loginAttempts.set(key, item);
  return item.count <= limit;
}

function decodeBase32(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = String(value || "").toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const char of normalized) {
    const index = alphabet.indexOf(char);
    if (index < 0) continue;
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

function totpAt(secret, counter) {
  const key = decodeBase32(secret);
  if (!key.length) return "";
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(message).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return String(value).padStart(6, "0");
}

function verifyAdminTotp(input) {
  if (!config.adminTotpSecret) return true;
  const code = String(input || "").replace(/\D/g, "");
  if (code.length !== 6) return false;
  const counter = Math.floor(Date.now() / 30000);
  return [-1, 0, 1].some((offset) => {
    const expected = totpAt(config.adminTotpSecret, counter + offset);
    return expected.length === code.length && timingSafeEqual(Buffer.from(expected), Buffer.from(code));
  });
}

function publicSecurityCode(row) {
  return {
    id: row.id,
    codePreview: row.code_preview,
    customerName: row.customer_name,
    contact: row.contact,
    remark: row.remark,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    permanent: Boolean(row.permanent),
    enabled: Boolean(row.enabled),
    loginCount: row.login_count,
    lastLoginAt: row.last_login_at,
    lastLoginIp: row.last_login_ip,
    online: Boolean(row.online),
    onlineCount: row.online_count ?? 0,
    deletedAt: row.deleted_at
  };
}

function standaloneKeyStatus(row) {
  if (row.deleted_at) return "deleted";
  if (row.status !== "active") return "disabled";
  if (!row.permanent && row.expires_at && Date.now() > new Date(row.expires_at).getTime()) return "expired";
  if (row.bound_device_id) return "bound";
  return "unbound";
}

function publicStandaloneKey(row) {
  return {
    id: row.id,
    keyPreview: row.key_preview,
    note: row.note,
    status: standaloneKeyStatus(row),
    enabled: row.status === "active" && !row.deleted_at,
    expiresAt: row.expires_at,
    permanent: Boolean(row.permanent),
    boundDeviceId: row.bound_device_id,
    boundAt: row.bound_at,
    boundIp: row.bound_ip,
    boundUserAgent: row.bound_user_agent,
    lastLoginAt: row.last_login_at,
    lastLoginIp: row.last_login_ip,
    lastUserAgent: row.last_user_agent,
    loginCount: row.login_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    disabledAt: row.disabled_at,
    deletedAt: row.deleted_at
  };
}

function createSession({ securityCodeId = null, adminUserId = null, projectId = null, mode = null, deviceId = null, deviceInfo = null, ipAddress = null }) {
  const token = randomToken();
  const csrfToken = randomToken(24);
  const session = {
    id: makeId("ses"),
    security_code_id: securityCodeId,
    admin_user_id: adminUserId,
    project_id: projectId,
    token_hash: hashSessionToken(token),
    csrf_token_hash: hashSessionToken(csrfToken),
    device_id: deviceId,
    device_info: deviceInfo,
    ip_address: ipAddress,
    mode,
    created_at: nowIso(),
    last_seen_at: nowIso(),
    expires_at: addDays(7),
    revoked_at: null
  };
  db.prepare(`
    INSERT INTO sessions (
      id, security_code_id, admin_user_id, project_id, token_hash, csrf_token_hash,
      device_id, device_info, ip_address, mode, created_at, last_seen_at, expires_at, revoked_at
    ) VALUES (
      @id, @security_code_id, @admin_user_id, @project_id, @token_hash, @csrf_token_hash,
      @device_id, @device_info, @ip_address, @mode, @created_at, @last_seen_at, @expires_at, @revoked_at
    )
  `).run(session);
  return { token, csrfToken, expiresAt: session.expires_at };
}

function ensureStandaloneSessionColumn() {
  const columns = db.prepare("PRAGMA table_info(sessions)").all();
  if (!columns.some((column) => column.name === "standalone_key_id")) {
    db.prepare("ALTER TABLE sessions ADD COLUMN standalone_key_id TEXT").run();
  }
}

function createStandaloneSession({ standaloneKeyId, deviceId = null, deviceInfo = null, ipAddress = null }) {
  const token = randomToken();
  const csrfToken = randomToken(24);
  const session = {
    id: makeId("ses"),
    standalone_key_id: standaloneKeyId,
    token_hash: hashSessionToken(token),
    csrf_token_hash: hashSessionToken(csrfToken),
    device_id: deviceId,
    device_info: deviceInfo,
    ip_address: ipAddress,
    mode: "standalone",
    created_at: nowIso(),
    last_seen_at: nowIso(),
    expires_at: addDays(7),
    revoked_at: null
  };
  db.prepare(`
    INSERT INTO sessions (
      id, standalone_key_id, token_hash, csrf_token_hash, device_id, device_info,
      ip_address, mode, created_at, last_seen_at, expires_at, revoked_at
    ) VALUES (
      @id, @standalone_key_id, @token_hash, @csrf_token_hash, @device_id, @device_info,
      @ip_address, @mode, @created_at, @last_seen_at, @expires_at, @revoked_at
    )
  `).run(session);
  return { token, csrfToken, expiresAt: session.expires_at };
}

function revokeStandaloneSessions(standaloneKeyId) {
  return db.prepare("UPDATE sessions SET revoked_at = ? WHERE standalone_key_id = ? AND revoked_at IS NULL")
    .run(nowIso(), standaloneKeyId);
}

function revokeActiveClientSessionsForSecurityCode(securityCodeId, req) {
  const ts = nowIso();
  const activeProjects = db.prepare(`
    SELECT DISTINCT project_id AS projectId
    FROM sessions
    WHERE security_code_id = ? AND revoked_at IS NULL AND project_id IS NOT NULL
  `).all(securityCodeId);

  db.prepare(`
    UPDATE sessions
    SET revoked_at = ?
    WHERE security_code_id = ? AND revoked_at IS NULL
  `).run(ts, securityCodeId);

  db.prepare(`
    UPDATE project_members
    SET online = 0, last_active_at = ?
    WHERE security_code_id = ?
  `).run(ts, securityCodeId);

  db.prepare("UPDATE security_codes SET online = 0, updated_at = ? WHERE id = ?").run(ts, securityCodeId);

  activeProjects.forEach((project) => {
    broadcast(project.projectId, { type: "session:revoked", securityCodeId });
  });

  if (activeProjects.length) {
    writeAuditLog(db, {
      actorType: "client",
      actorId: securityCodeId,
      securityCodeId,
      action: "replace_device_login",
      entityType: "security_code",
      entityId: securityCodeId,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: { projectIds: activeProjects.map((project) => project.projectId) }
    });
  }
}

function resetSecurityCodeSessions(securityCodeId, req, action = "reset") {
  const ts = nowIso();
  const activeProjects = db.prepare(`
    SELECT DISTINCT project_id AS projectId
    FROM sessions
    WHERE security_code_id = ? AND revoked_at IS NULL AND project_id IS NOT NULL
  `).all(securityCodeId);

  db.prepare("UPDATE sessions SET revoked_at = ? WHERE security_code_id = ? AND revoked_at IS NULL").run(ts, securityCodeId);
  db.prepare("UPDATE project_members SET online = 0, last_active_at = ? WHERE security_code_id = ?").run(ts, securityCodeId);
  db.prepare("UPDATE security_codes SET online = 0, updated_at = ? WHERE id = ?").run(ts, securityCodeId);
  activeProjects.forEach((project) => broadcast(project.projectId, { type: "session:revoked", securityCodeId }));
  writeAuditLog(db, {
    actorType: req.admin ? "admin" : "system",
    actorId: req.admin?.id || null,
    securityCodeId,
    action,
    entityType: "security_code",
    entityId: securityCodeId,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
    metadata: { projectIds: activeProjects.map((project) => project.projectId) }
  });
}

function ensureDefaultAdmin() {
  const existing = db.prepare("SELECT id FROM admin_users WHERE username = ?").get(config.adminUsername);
  const ts = nowIso();
  if (existing) {
    db.prepare(`
      UPDATE admin_users
      SET password_hash = ?, status = 'active', updated_at = ?
      WHERE id = ?
    `).run(config.adminPasswordHash, ts, existing.id);
    return;
  }
  db.prepare(`
    INSERT INTO admin_users (id, username, password_hash, status, created_at, updated_at)
    VALUES (?, ?, ?, 'active', ?, ?)
  `).run(makeId("adm"), config.adminUsername, config.adminPasswordHash, ts, ts);
}

function orderSnapshot(order) {
  if (!order) return null;
  return {
    id: order.id,
    projectId: order.project_id,
    customerName: order.customer_name,
    region: order.region,
    playType: order.play_type,
    content: JSON.parse(order.content_json),
    amount: order.amount,
    odds: order.odds,
    rebate: order.rebate,
    total: order.total,
    status: order.status,
    profit: order.profit,
    version: order.version,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    deletedAt: order.deleted_at,
    deleteReason: order.delete_reason
  };
}

function recordRevision({ orderId, projectId, actorMemberId, action, before, after, reason, req }) {
  db.prepare(`
    INSERT INTO order_revisions (
      id, order_id, project_id, actor_member_id, action, before_json, after_json,
      reason, ip_address, user_agent, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    makeId("rev"),
    orderId,
    projectId,
    actorMemberId || null,
    action,
    before ? JSON.stringify(before) : null,
    after ? JSON.stringify(after) : null,
    reason || null,
    req.ip,
    req.get("user-agent") || null,
    nowIso()
  );
}

function projectSummary(projectId) {
  const total = db.prepare(`
    SELECT COUNT(*) AS order_count, COALESCE(SUM(total), 0) AS total_amount,
           COALESCE(SUM(profit), 0) AS total_profit
    FROM orders
    WHERE project_id = ? AND deleted_at IS NULL
  `).get(projectId);
  const byPlay = db.prepare(`
    SELECT play_type AS playType, COALESCE(SUM(total), 0) AS total
    FROM orders
    WHERE project_id = ? AND deleted_at IS NULL
    GROUP BY play_type
    ORDER BY total DESC
  `).all(projectId);
  return { orderCount: total.order_count, totalAmount: total.total_amount, totalProfit: total.total_profit, byPlay };
}

function broadcast(projectId, payload) {
  const sockets = projectSockets.get(projectId);
  if (!sockets) return;
  const message = JSON.stringify(payload);
  for (const socket of sockets) {
    if (socket.readyState === socket.OPEN) socket.send(message);
  }
}

ensureDefaultAdmin();

app.get("/health", (_req, res) => {
  res.json({ ok: true, mode: config.nodeEnv });
});

app.post("/api/admin/login", async (req, res) => {
  if (!rateLimit(`admin:${req.ip}`, 8)) return res.status(429).json({ error: "too_many_attempts" });
  const { username, password, totp } = req.body || {};
  const admin = db.prepare("SELECT * FROM admin_users WHERE username = ? AND status = 'active'").get(username || "");
  const passwordOk = admin && await verifyPassword(password, admin.password_hash);
  const ok = passwordOk && verifyAdminTotp(totp);
  writeAuditLog(db, {
    actorType: "admin",
    actorId: admin?.id || username || null,
    action: ok ? "login" : "login_failed",
    entityType: "admin_user",
    entityId: admin?.id || null,
    ipAddress: req.ip,
    userAgent: req.get("user-agent")
  });
  if (!ok) return res.status(401).json({ error: "invalid_admin_login" });
  db.prepare("UPDATE admin_users SET last_login_at = ?, updated_at = ? WHERE id = ?").run(nowIso(), nowIso(), admin.id);
  res.json(createSession({ adminUserId: admin.id, mode: "admin", ipAddress: req.ip, deviceInfo: req.get("user-agent") }));
});

app.get("/api/admin/standalone-keys", requireAdmin(db), (req, res) => {
  const q = `%${String(req.query.q || "").trim()}%`;
  const rows = db.prepare(`
    SELECT * FROM standalone_keys
    WHERE deleted_at IS NULL
      AND (? = '%%' OR note LIKE ? OR key_preview LIKE ? OR bound_device_id LIKE ? OR last_login_ip LIKE ?)
    ORDER BY created_at DESC
    LIMIT 300
  `).all(q, q, q, q, q);
  res.json({ items: rows.map(publicStandaloneKey) });
});

app.post("/api/admin/standalone-keys", requireAdmin(db), (req, res) => {
  const { note = "", duration = "365", customExpiresAt = null } = req.body || {};
  const expiry = expiryFromDuration(duration, customExpiresAt);
  const ts = nowIso();
  let key = "";
  let row = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    key = randomAccessCode("CJY-DJ-");
    row = {
      id: makeId("stk"),
      key_hash: hashStandaloneKey(key),
      key_preview: codePreview(key),
      note,
      status: "active",
      expires_at: expiry.expiresAt,
      permanent: expiry.permanent,
      created_by: req.admin.id,
      created_at: ts,
      updated_at: ts
    };
    try {
      db.prepare(`
        INSERT INTO standalone_keys (
          id, key_hash, key_preview, note, status, expires_at, permanent,
          created_by, created_at, updated_at
        ) VALUES (
          @id, @key_hash, @key_preview, @note, @status, @expires_at, @permanent,
          @created_by, @created_at, @updated_at
        )
      `).run(row);
      break;
    } catch (error) {
      if (!String(error.message || "").includes("UNIQUE") || attempt === 4) throw error;
    }
  }
  writeAuditLog(db, { actorType: "admin", actorId: req.admin.id, action: "create", entityType: "standalone_key", entityId: row.id, ipAddress: req.ip, userAgent: req.get("user-agent") });
  res.status(201).json({ key, item: publicStandaloneKey(row) });
});

app.patch("/api/admin/standalone-keys/:id", requireAdmin(db), (req, res) => {
  const current = db.prepare("SELECT * FROM standalone_keys WHERE id = ? AND deleted_at IS NULL").get(req.params.id);
  if (!current) return res.status(404).json({ error: "standalone_key_not_found" });
  const enabled = req.body.enabled == null ? current.status === "active" : Boolean(req.body.enabled);
  const next = {
    note: req.body.note ?? current.note,
    status: enabled ? "active" : "disabled",
    disabled_at: enabled ? null : (current.disabled_at || nowIso()),
    updated_at: nowIso(),
    id: current.id
  };
  if (req.body.duration) {
    const expiry = expiryFromDuration(req.body.duration, req.body.customExpiresAt);
    next.permanent = expiry.permanent;
    next.expires_at = expiry.expiresAt;
  } else {
    next.permanent = current.permanent;
    next.expires_at = current.expires_at;
  }
  db.prepare(`
    UPDATE standalone_keys
    SET note = @note, status = @status, permanent = @permanent,
        expires_at = @expires_at, disabled_at = @disabled_at, updated_at = @updated_at
    WHERE id = @id
  `).run(next);
  if (!enabled) revokeStandaloneSessions(current.id);
  const item = { ...current, ...next };
  writeAuditLog(db, { actorType: "admin", actorId: req.admin.id, action: "update", entityType: "standalone_key", entityId: current.id, ipAddress: req.ip, userAgent: req.get("user-agent"), metadata: { before: publicStandaloneKey(current), after: publicStandaloneKey(item) } });
  res.json({ item: publicStandaloneKey(item) });
});

app.post("/api/admin/standalone-keys/:id/reset-device", requireAdmin(db), (req, res) => {
  const current = db.prepare("SELECT * FROM standalone_keys WHERE id = ? AND deleted_at IS NULL").get(req.params.id);
  if (!current) return res.status(404).json({ error: "standalone_key_not_found" });
  db.prepare(`
    UPDATE standalone_keys
    SET bound_device_id = NULL, bound_at = NULL, bound_ip = NULL,
        bound_user_agent = NULL, updated_at = ?
    WHERE id = ?
  `).run(nowIso(), current.id);
  revokeStandaloneSessions(current.id);
  writeAuditLog(db, { actorType: "admin", actorId: req.admin.id, action: "reset_device", entityType: "standalone_key", entityId: current.id, ipAddress: req.ip, userAgent: req.get("user-agent") });
  res.json({ ok: true });
});

app.delete("/api/admin/standalone-keys/:id", requireAdmin(db), (req, res) => {
  const current = db.prepare("SELECT * FROM standalone_keys WHERE id = ? AND deleted_at IS NULL").get(req.params.id);
  if (!current) return res.status(404).json({ error: "standalone_key_not_found" });
  db.prepare("UPDATE standalone_keys SET deleted_at = ?, status = 'disabled', disabled_at = COALESCE(disabled_at, ?), updated_at = ? WHERE id = ?")
    .run(nowIso(), nowIso(), nowIso(), current.id);
  revokeStandaloneSessions(current.id);
  writeAuditLog(db, { actorType: "admin", actorId: req.admin.id, action: "delete", entityType: "standalone_key", entityId: current.id, ipAddress: req.ip, userAgent: req.get("user-agent") });
  res.json({ ok: true });
});

app.get("/api/admin/security-codes", requireAdmin(db), (req, res) => {
  const q = `%${String(req.query.q || "").trim()}%`;
  const now = nowIso();
  const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
  const rows = db.prepare(`
    SELECT sc.*,
      (SELECT COUNT(*) FROM sessions s WHERE s.security_code_id = sc.id AND s.revoked_at IS NULL AND s.expires_at > ? AND s.last_seen_at >= ?) AS online_count
    FROM security_codes sc
    WHERE sc.deleted_at IS NULL
      AND (? = '%%' OR sc.customer_name LIKE ? OR sc.contact LIKE ? OR sc.remark LIKE ? OR sc.code_preview LIKE ?)
    ORDER BY sc.created_at DESC
    LIMIT 200
  `).all(now, onlineSince, q, q, q, q, q);
  res.json({ items: rows.map(publicSecurityCode) });
});

app.post("/api/admin/security-codes", requireAdmin(db), (req, res) => {
  const { customerName, contact = "", remark = "", duration = "365", customExpiresAt = null } = req.body || {};
  if (!customerName) return res.status(400).json({ error: "customer_required" });
  const expiry = expiryFromDuration(duration, customExpiresAt);
  const ts = nowIso();
  let code = "";
  let row = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    code = randomAccessCode("CJY-LJ-");
    row = {
      id: makeId("sec"),
      code_hash: hashSecurityCode(code),
      code_preview: codePreview(code),
      customer_name: customerName,
      contact,
      remark,
      created_at: ts,
      expires_at: expiry.expiresAt,
      permanent: expiry.permanent,
      enabled: 1,
      created_by: req.admin.id,
      updated_at: ts
    };
    try {
      db.prepare(`
        INSERT INTO security_codes (
          id, code_hash, code_preview, customer_name, contact, remark, created_at,
          expires_at, permanent, enabled, created_by, updated_at
        ) VALUES (
          @id, @code_hash, @code_preview, @customer_name, @contact, @remark, @created_at,
          @expires_at, @permanent, @enabled, @created_by, @updated_at
        )
      `).run(row);
      break;
    } catch (error) {
      if (!String(error.message || "").includes("UNIQUE") || attempt === 4) throw error;
    }
  }
  writeAuditLog(db, { actorType: "admin", actorId: req.admin.id, action: "create", entityType: "security_code", entityId: row.id, ipAddress: req.ip, userAgent: req.get("user-agent") });
  res.status(201).json({ code, item: publicSecurityCode({ ...row, online_count: 0 }) });
});

app.post("/api/admin/security-codes/:id/kick", requireAdmin(db), (req, res) => {
  const current = db.prepare("SELECT * FROM security_codes WHERE id = ? AND deleted_at IS NULL").get(req.params.id);
  if (!current) return res.status(404).json({ error: "security_code_not_found" });
  resetSecurityCodeSessions(current.id, req, "kick");
  res.json({ ok: true });
});

app.post("/api/admin/security-codes/:id/reset", requireAdmin(db), (req, res) => {
  const current = db.prepare("SELECT * FROM security_codes WHERE id = ? AND deleted_at IS NULL").get(req.params.id);
  if (!current) return res.status(404).json({ error: "security_code_not_found" });
  resetSecurityCodeSessions(current.id, req, "reset");
  res.json({ ok: true });
});

app.post("/api/admin/security-codes/kick-all", requireAdmin(db), (req, res) => {
  const ts = nowIso();
  const activeProjects = db.prepare(`
    SELECT DISTINCT project_id AS projectId
    FROM sessions
    WHERE security_code_id IS NOT NULL AND revoked_at IS NULL AND project_id IS NOT NULL
  `).all();
  const result = db.prepare("UPDATE sessions SET revoked_at = ? WHERE security_code_id IS NOT NULL AND revoked_at IS NULL").run(ts);
  db.prepare("UPDATE project_members SET online = 0, last_active_at = ?").run(ts);
  db.prepare("UPDATE security_codes SET online = 0, updated_at = ?").run(ts);
  activeProjects.forEach((project) => broadcast(project.projectId, { type: "session:revoked" }));
  writeAuditLog(db, { actorType: "admin", actorId: req.admin.id, action: "kick_all", entityType: "security_code", ipAddress: req.ip, userAgent: req.get("user-agent"), metadata: { count: result.changes || 0 } });
  res.json({ ok: true, count: result.changes || 0 });
});

app.patch("/api/admin/security-codes/:id", requireAdmin(db), (req, res) => {
  const current = db.prepare("SELECT * FROM security_codes WHERE id = ? AND deleted_at IS NULL").get(req.params.id);
  if (!current) return res.status(404).json({ error: "security_code_not_found" });
  const next = {
    customer_name: req.body.customerName ?? current.customer_name,
    contact: req.body.contact ?? current.contact,
    remark: req.body.remark ?? current.remark,
    enabled: req.body.enabled == null ? current.enabled : (req.body.enabled ? 1 : 0),
    updated_at: nowIso(),
    id: current.id
  };
  if (req.body.duration) {
    const expiry = expiryFromDuration(req.body.duration, req.body.customExpiresAt);
    next.permanent = expiry.permanent;
    next.expires_at = expiry.expiresAt;
  } else {
    next.permanent = current.permanent;
    next.expires_at = current.expires_at;
  }
  db.prepare(`
    UPDATE security_codes
    SET customer_name = @customer_name, contact = @contact, remark = @remark,
        enabled = @enabled, permanent = @permanent, expires_at = @expires_at, updated_at = @updated_at
    WHERE id = @id
  `).run(next);
  if (current.enabled && !next.enabled) resetSecurityCodeSessions(current.id, req, "disable");
  writeAuditLog(db, { actorType: "admin", actorId: req.admin.id, action: "update", entityType: "security_code", entityId: current.id, ipAddress: req.ip, userAgent: req.get("user-agent"), metadata: { before: publicSecurityCode(current), after: next } });
  res.json({ item: publicSecurityCode({ ...current, ...next }) });
});

app.post("/api/admin/security-codes/:id/renew", requireAdmin(db), (req, res) => {
  const current = db.prepare("SELECT * FROM security_codes WHERE id = ? AND deleted_at IS NULL").get(req.params.id);
  if (!current) return res.status(404).json({ error: "security_code_not_found" });
  const expiry = expiryFromDuration(req.body?.duration || "365", req.body?.customExpiresAt);
  db.prepare("UPDATE security_codes SET permanent = ?, expires_at = ?, updated_at = ? WHERE id = ?")
    .run(expiry.permanent, expiry.expiresAt, nowIso(), current.id);
  writeAuditLog(db, { actorType: "admin", actorId: req.admin.id, action: "renew", entityType: "security_code", entityId: current.id, ipAddress: req.ip, userAgent: req.get("user-agent") });
  res.json({ ok: true });
});

app.delete("/api/admin/security-codes/:id", requireAdmin(db), (req, res) => {
  const current = db.prepare("SELECT * FROM security_codes WHERE id = ? AND deleted_at IS NULL").get(req.params.id);
  if (!current) return res.status(404).json({ error: "security_code_not_found" });
  resetSecurityCodeSessions(current.id, req, "delete_reset");
  db.prepare("UPDATE security_codes SET deleted_at = ?, enabled = 0, online = 0, updated_at = ? WHERE id = ?")
    .run(nowIso(), nowIso(), current.id);
  writeAuditLog(db, { actorType: "admin", actorId: req.admin.id, action: "delete", entityType: "security_code", entityId: current.id, ipAddress: req.ip, userAgent: req.get("user-agent") });
  res.json({ ok: true });
});

app.post("/api/auth/standalone-key", (req, res) => {
  if (!rateLimit(`standalone:${req.ip}`, 20)) return res.status(429).json({ error: "too_many_attempts" });
  const { key, deviceId = "", deviceInfo = "" } = req.body || {};
  if (!key || !deviceId) return res.status(400).json({ error: "key_and_device_required" });
  const row = db.prepare("SELECT * FROM standalone_keys WHERE key_hash = ? AND deleted_at IS NULL").get(hashStandaloneKey(key));
  if (!row) {
    writeAuditLog(db, { actorType: "client", action: "standalone_login_failed", entityType: "standalone_key", ipAddress: req.ip, userAgent: req.get("user-agent"), metadata: { reason: "missing" } });
    return res.status(401).json({ error: "invalid_standalone_key" });
  }
  if (row.status !== "active") {
    writeAuditLog(db, { actorType: "client", action: "standalone_login_failed", entityType: "standalone_key", entityId: row.id, ipAddress: req.ip, userAgent: req.get("user-agent"), metadata: { reason: "disabled" } });
    return res.status(403).json({ error: "standalone_key_disabled" });
  }
  if (!row.permanent && row.expires_at && Date.now() > new Date(row.expires_at).getTime()) {
    writeAuditLog(db, { actorType: "client", action: "standalone_login_failed", entityType: "standalone_key", entityId: row.id, ipAddress: req.ip, userAgent: req.get("user-agent"), metadata: { reason: "expired" } });
    return res.status(403).json({ error: "standalone_key_expired" });
  }
  if (row.bound_device_id && row.bound_device_id !== deviceId) {
    writeAuditLog(db, { actorType: "client", action: "standalone_login_failed", entityType: "standalone_key", entityId: row.id, ipAddress: req.ip, userAgent: req.get("user-agent"), metadata: { reason: "device_mismatch", deviceId } });
    return res.status(403).json({ error: "standalone_key_bound_to_other_device" });
  }
  const ts = nowIso();
  if (!row.bound_device_id) {
    db.prepare(`
      UPDATE standalone_keys
      SET bound_device_id = ?, bound_at = ?, bound_ip = ?, bound_user_agent = ?,
          last_login_at = ?, last_login_ip = ?, last_user_agent = ?,
          login_count = login_count + 1, updated_at = ?
      WHERE id = ?
    `).run(deviceId, ts, req.ip, req.get("user-agent") || deviceInfo || "", ts, req.ip, req.get("user-agent") || deviceInfo || "", ts, row.id);
  } else {
    db.prepare(`
      UPDATE standalone_keys
      SET last_login_at = ?, last_login_ip = ?, last_user_agent = ?,
          login_count = login_count + 1, updated_at = ?
      WHERE id = ?
    `).run(ts, req.ip, req.get("user-agent") || deviceInfo || "", ts, row.id);
  }
  const next = db.prepare("SELECT * FROM standalone_keys WHERE id = ?").get(row.id);
  const session = createStandaloneSession({
    standaloneKeyId: row.id,
    deviceId,
    deviceInfo: req.get("user-agent") || deviceInfo || "",
    ipAddress: req.ip
  });
  writeAuditLog(db, { actorType: "client", actorId: row.id, action: "standalone_login", entityType: "standalone_key", entityId: row.id, ipAddress: req.ip, userAgent: req.get("user-agent"), metadata: { deviceId } });
  res.json({ ok: true, mode: "standalone", item: publicStandaloneKey(next), token: session.token, csrfToken: session.csrfToken });
});

app.get("/api/admin/projects", requireAdmin(db), (_req, res) => {
  const rows = db.prepare(`
    SELECT p.*, sc.customer_name,
      (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id AND pm.online = 1) AS online_count
    FROM projects p
    JOIN security_codes sc ON sc.id = p.security_code_id
    ORDER BY p.created_at DESC
    LIMIT 200
  `).all();
  res.json({ items: rows });
});

app.get("/api/admin/projects/:projectId/members", requireAdmin(db), (req, res) => {
  const rows = db.prepare(`
    SELECT pm.*, sc.customer_name, sc.last_login_ip
    FROM project_members pm
    JOIN security_codes sc ON sc.id = pm.security_code_id
    WHERE pm.project_id = ?
    ORDER BY pm.online DESC, pm.last_active_at DESC
  `).all(req.params.projectId);
  res.json({ items: rows });
});

app.post("/api/admin/projects/:projectId/members/:memberId/kick", requireAdmin(db), (req, res) => {
  const member = db.prepare("SELECT * FROM project_members WHERE id = ? AND project_id = ?").get(req.params.memberId, req.params.projectId);
  if (!member) return res.status(404).json({ error: "member_not_found" });
  const ts = nowIso();
  db.prepare("UPDATE project_members SET online = 0, last_active_at = ? WHERE id = ?").run(ts, member.id);
  db.prepare("UPDATE sessions SET revoked_at = ? WHERE project_id = ? AND security_code_id = ? AND revoked_at IS NULL").run(ts, req.params.projectId, member.security_code_id);
  writeAuditLog(db, { actorType: "admin", actorId: req.admin.id, projectId: req.params.projectId, securityCodeId: member.security_code_id, action: "kick", entityType: "project_member", entityId: member.id, ipAddress: req.ip, userAgent: req.get("user-agent") });
  broadcast(req.params.projectId, { type: "member:kicked", memberId: member.id });
  res.json({ ok: true });
});

app.get("/api/admin/logs", requireAdmin(db), (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM audit_logs
    WHERE (? IS NULL OR action = ?)
    ORDER BY created_at DESC
    LIMIT 300
  `).all(req.query.action || null, req.query.action || null);
  res.json({ items: rows.map((row) => ({ ...row, metadata: JSON.parse(row.metadata_json || "{}") })) });
});

app.post("/api/auth/security-code", (req, res) => {
  if (!rateLimit(`client:${req.ip}`, 20)) return res.status(429).json({ error: "too_many_attempts" });
  const { code, deviceId = "", deviceInfo = "" } = req.body || {};
  const row = db.prepare("SELECT * FROM security_codes WHERE code_hash = ? AND deleted_at IS NULL").get(hashSecurityCode(code));
  if (!row || !row.enabled || isExpired(row)) {
    writeAuditLog(db, { actorType: "client", action: "login_failed", entityType: "security_code", ipAddress: req.ip, userAgent: req.get("user-agent") });
    return res.status(401).json({ error: "invalid_security_code" });
  }
  const session = createSession({ securityCodeId: row.id, mode: "client", deviceId, deviceInfo, ipAddress: req.ip });
  db.prepare(`
    UPDATE security_codes
    SET login_count = login_count + 1, last_login_at = ?, last_login_ip = ?, online = 1, updated_at = ?
    WHERE id = ?
  `).run(nowIso(), req.ip, nowIso(), row.id);
  writeAuditLog(db, { actorType: "client", actorId: row.id, securityCodeId: row.id, action: "login", entityType: "security_code", entityId: row.id, ipAddress: req.ip, userAgent: req.get("user-agent") });
  res.json({ ...session, securityCode: publicSecurityCode(row) });
});

app.get("/api/projects", requireClient(db), (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id AND pm.online = 1) AS online_count
    FROM projects p
    WHERE p.security_code_id = ? AND p.deleted_at IS NULL
    ORDER BY p.created_at DESC
  `).all(req.client.securityCodeId);
  res.json({ items: rows });
});

app.post("/api/session/heartbeat", (req, res) => {
  const auth = String(req.get("authorization") || "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) return res.status(401).json({ error: "auth_required" });
  const session = db.prepare(`
    SELECT s.*,
           c.enabled AS code_enabled, c.deleted_at AS code_deleted_at, c.permanent AS code_permanent, c.expires_at AS code_expires_at,
           sk.status AS standalone_status, sk.deleted_at AS standalone_deleted_at, sk.permanent AS standalone_permanent,
           sk.expires_at AS standalone_expires_at, sk.bound_device_id AS standalone_bound_device_id
    FROM sessions s
    LEFT JOIN security_codes c ON c.id = s.security_code_id
    LEFT JOIN standalone_keys sk ON sk.id = s.standalone_key_id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
  `).get(hashSessionToken(token), nowIso());
  if (!session) return res.status(401).json({ error: "auth_required" });
  const csrf = req.get("x-csrf-token");
  if (hashSessionToken(csrf || "") !== session.csrf_token_hash) {
    return res.status(403).json({ error: "csrf_failed" });
  }
  if (session.mode === "standalone") {
    const disabled = session.standalone_status !== "active" || session.standalone_deleted_at ||
      (!session.standalone_permanent && session.standalone_expires_at && Date.now() > new Date(session.standalone_expires_at).getTime()) ||
      (session.standalone_bound_device_id && session.device_id && session.standalone_bound_device_id !== session.device_id);
    if (disabled) {
      db.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ?").run(nowIso(), session.id);
      return res.status(401).json({ error: "standalone_session_revoked" });
    }
    const ts = nowIso();
    db.prepare("UPDATE sessions SET last_seen_at = ?, device_info = COALESCE(?, device_info), ip_address = ? WHERE id = ?")
      .run(ts, req.body?.deviceInfo || null, req.ip, session.id);
    return res.json({ ok: true, mode: "standalone", serverTime: ts });
  }
  if (!session.code_enabled || session.code_deleted_at ||
      (!session.code_permanent && session.code_expires_at && Date.now() > new Date(session.code_expires_at).getTime())) {
    db.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ?").run(nowIso(), session.id);
    return res.status(401).json({ error: "security_code_session_revoked" });
  }
  const ts = nowIso();
  db.prepare("UPDATE sessions SET last_seen_at = ?, device_info = COALESCE(?, device_info), ip_address = ? WHERE id = ?")
    .run(ts, req.body?.deviceInfo || null, req.ip, session.id);
  if (session.project_id) {
    db.prepare("UPDATE project_members SET online = 1, last_active_at = ?, device_info = COALESCE(?, device_info), ip_address = ? WHERE project_id = ? AND security_code_id = ?")
      .run(ts, req.body?.deviceInfo || null, req.ip, session.project_id, session.security_code_id);
  }
  db.prepare("UPDATE security_codes SET online = 1, updated_at = ? WHERE id = ?").run(ts, session.security_code_id);
  res.json({ ok: true, serverTime: ts });
});

app.post("/api/session/logout", requireClient(db), (req, res) => {
  const ts = nowIso();
  db.prepare("UPDATE sessions SET revoked_at = ? WHERE id = ?").run(ts, req.client.session.id);
  if (req.client.projectId) {
    db.prepare("UPDATE project_members SET online = 0, last_active_at = ? WHERE project_id = ? AND security_code_id = ?")
      .run(ts, req.client.projectId, req.client.securityCodeId);
  }
  db.prepare("UPDATE security_codes SET online = 0, updated_at = ? WHERE id = ?").run(ts, req.client.securityCodeId);
  writeAuditLog(db, { actorType: "client", actorId: req.client.securityCodeId, securityCodeId: req.client.securityCodeId, projectId: req.client.projectId, action: "logout", entityType: "session", entityId: req.client.session.id, ipAddress: req.ip, userAgent: req.get("user-agent") });
  res.json({ ok: true });
});

app.post("/api/projects", requireClient(db), (req, res) => {
  const { name, mode } = req.body || {};
  if (!name || !["standalone", "collaboration"].includes(mode)) return res.status(400).json({ error: "invalid_project" });
  const ts = nowIso();
  const projectId = makeId("prj");
  const memberId = makeId("mem");
  withTransaction(db, () => {
    db.prepare(`
      INSERT INTO projects (id, security_code_id, name, mode, status, created_by_member_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?, ?)
    `).run(projectId, req.client.securityCodeId, name, mode, memberId, ts, ts);
    db.prepare(`
      INSERT INTO project_members (id, project_id, security_code_id, role, display_name, joined_at, last_active_at, device_info, ip_address, online)
      SELECT ?, ?, id, 'owner', customer_name, ?, ?, ?, ?, 1 FROM security_codes WHERE id = ?
    `).run(memberId, projectId, ts, ts, req.get("user-agent") || "", req.ip, req.client.securityCodeId);
    db.prepare("UPDATE sessions SET project_id = ?, mode = ? WHERE id = ?").run(projectId, mode, req.client.session.id);
  });
  writeAuditLog(db, { actorType: "client", actorId: req.client.securityCodeId, securityCodeId: req.client.securityCodeId, projectId, action: "create", entityType: "project", entityId: projectId, ipAddress: req.ip, userAgent: req.get("user-agent"), metadata: { mode } });
  res.status(201).json({ id: projectId, name, mode, memberId });
});

app.get("/api/projects/:projectId/orders", requireClient(db), (req, res) => {
  const rows = db.prepare("SELECT * FROM orders WHERE project_id = ? ORDER BY created_at DESC LIMIT 1000").all(req.params.projectId);
  res.json({ items: rows.map(orderSnapshot), summary: projectSummary(req.params.projectId) });
});

app.post("/api/projects/:projectId/orders", requireClient(db), (req, res) => {
  const project = db.prepare("SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL").get(req.params.projectId);
  if (!project) return res.status(404).json({ error: "project_not_found" });
  const member = db.prepare("SELECT * FROM project_members WHERE project_id = ? AND security_code_id = ?").get(project.id, req.client.securityCodeId);
  if (!member) return res.status(403).json({ error: "project_member_required" });
  const body = req.body || {};
  const ts = nowIso();
  const order = {
    id: makeId("ord"),
    project_id: project.id,
    security_code_id: req.client.securityCodeId,
    created_by_member_id: member.id,
    customer_name: body.customerName || "",
    region: body.region,
    play_type: body.playType,
    content_json: JSON.stringify(body.content || []),
    amount: Number(body.amount || 0),
    odds: Number(body.odds || 1),
    rebate: Number(body.rebate || 0),
    total: Number(body.total ?? body.amount ?? 0),
    status: body.status || "pending",
    profit: Number(body.profit || 0),
    created_at: ts,
    updated_at: ts
  };
  if (!order.region || !order.play_type) return res.status(400).json({ error: "invalid_order" });
  withTransaction(db, () => {
    db.prepare(`
      INSERT INTO orders (
        id, project_id, security_code_id, created_by_member_id, customer_name, region, play_type,
        content_json, amount, odds, rebate, total, status, profit, created_at, updated_at
      ) VALUES (
        @id, @project_id, @security_code_id, @created_by_member_id, @customer_name, @region, @play_type,
        @content_json, @amount, @odds, @rebate, @total, @status, @profit, @created_at, @updated_at
      )
    `).run(order);
    recordRevision({ orderId: order.id, projectId: project.id, actorMemberId: member.id, action: "create", after: orderSnapshot(order), req });
  });
  writeAuditLog(db, { actorType: "client", actorId: req.client.securityCodeId, securityCodeId: req.client.securityCodeId, projectId: project.id, action: "create", entityType: "order", entityId: order.id, ipAddress: req.ip, userAgent: req.get("user-agent") });
  broadcast(project.id, { type: "order:create", order: orderSnapshot(order), summary: projectSummary(project.id) });
  res.status(201).json({ item: orderSnapshot(order), summary: projectSummary(project.id) });
});

app.patch("/api/projects/:projectId/orders/:orderId", requireClient(db), (req, res) => {
  const current = db.prepare("SELECT * FROM orders WHERE id = ? AND project_id = ?").get(req.params.orderId, req.params.projectId);
  if (!current || current.deleted_at) return res.status(404).json({ error: "order_not_found" });
  const member = db.prepare("SELECT * FROM project_members WHERE project_id = ? AND security_code_id = ?").get(req.params.projectId, req.client.securityCodeId);
  if (!member) return res.status(403).json({ error: "project_member_required" });
  const before = orderSnapshot(current);
  const next = {
    customer_name: req.body.customerName ?? current.customer_name,
    region: req.body.region ?? current.region,
    play_type: req.body.playType ?? current.play_type,
    content_json: req.body.content == null ? current.content_json : JSON.stringify(req.body.content),
    amount: req.body.amount == null ? current.amount : Number(req.body.amount),
    odds: req.body.odds == null ? current.odds : Number(req.body.odds),
    rebate: req.body.rebate == null ? current.rebate : Number(req.body.rebate),
    total: req.body.total == null ? current.total : Number(req.body.total),
    status: req.body.status ?? current.status,
    profit: req.body.profit == null ? current.profit : Number(req.body.profit),
    updated_at: nowIso(),
    version: current.version + 1,
    id: current.id
  };
  db.prepare(`
    UPDATE orders SET customer_name = @customer_name, region = @region, play_type = @play_type,
      content_json = @content_json, amount = @amount, odds = @odds, rebate = @rebate,
      total = @total, status = @status, profit = @profit, updated_at = @updated_at, version = @version
    WHERE id = @id
  `).run(next);
  const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(current.id);
  recordRevision({ orderId: current.id, projectId: req.params.projectId, actorMemberId: member.id, action: "update", before, after: orderSnapshot(updated), req });
  writeAuditLog(db, { actorType: "client", actorId: req.client.securityCodeId, securityCodeId: req.client.securityCodeId, projectId: req.params.projectId, action: "update", entityType: "order", entityId: current.id, ipAddress: req.ip, userAgent: req.get("user-agent") });
  broadcast(req.params.projectId, { type: "order:update", order: orderSnapshot(updated), summary: projectSummary(req.params.projectId) });
  res.json({ item: orderSnapshot(updated), summary: projectSummary(req.params.projectId) });
});

app.delete("/api/projects/:projectId/orders/:orderId", requireClient(db), (req, res) => {
  const current = db.prepare("SELECT * FROM orders WHERE id = ? AND project_id = ?").get(req.params.orderId, req.params.projectId);
  if (!current || current.deleted_at) return res.status(404).json({ error: "order_not_found" });
  const member = db.prepare("SELECT * FROM project_members WHERE project_id = ? AND security_code_id = ?").get(req.params.projectId, req.client.securityCodeId);
  if (!member) return res.status(403).json({ error: "project_member_required" });
  const before = orderSnapshot(current);
  db.prepare("UPDATE orders SET deleted_at = ?, deleted_by_member_id = ?, delete_reason = ?, updated_at = ?, version = version + 1 WHERE id = ?")
    .run(nowIso(), member.id, req.body?.reason || "录错", nowIso(), current.id);
  const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(current.id);
  recordRevision({ orderId: current.id, projectId: req.params.projectId, actorMemberId: member.id, action: "delete", before, after: orderSnapshot(updated), reason: req.body?.reason, req });
  writeAuditLog(db, { actorType: "client", actorId: req.client.securityCodeId, securityCodeId: req.client.securityCodeId, projectId: req.params.projectId, action: "delete", entityType: "order", entityId: current.id, ipAddress: req.ip, userAgent: req.get("user-agent") });
  broadcast(req.params.projectId, { type: "order:delete", order: orderSnapshot(updated), summary: projectSummary(req.params.projectId) });
  res.json({ item: orderSnapshot(updated), summary: projectSummary(req.params.projectId) });
});

app.post("/api/projects/:projectId/orders/:orderId/restore", requireClient(db), (req, res) => {
  const current = db.prepare("SELECT * FROM orders WHERE id = ? AND project_id = ?").get(req.params.orderId, req.params.projectId);
  if (!current || !current.deleted_at) return res.status(404).json({ error: "deleted_order_not_found" });
  const member = db.prepare("SELECT * FROM project_members WHERE project_id = ? AND security_code_id = ?").get(req.params.projectId, req.client.securityCodeId);
  if (!member) return res.status(403).json({ error: "project_member_required" });
  const before = orderSnapshot(current);
  db.prepare("UPDATE orders SET deleted_at = NULL, deleted_by_member_id = NULL, delete_reason = NULL, updated_at = ?, version = version + 1 WHERE id = ?")
    .run(nowIso(), current.id);
  const updated = db.prepare("SELECT * FROM orders WHERE id = ?").get(current.id);
  recordRevision({ orderId: current.id, projectId: req.params.projectId, actorMemberId: member.id, action: "restore", before, after: orderSnapshot(updated), req });
  writeAuditLog(db, { actorType: "client", actorId: req.client.securityCodeId, securityCodeId: req.client.securityCodeId, projectId: req.params.projectId, action: "restore", entityType: "order", entityId: current.id, ipAddress: req.ip, userAgent: req.get("user-agent") });
  broadcast(req.params.projectId, { type: "order:restore", order: orderSnapshot(updated), summary: projectSummary(req.params.projectId) });
  res.json({ item: orderSnapshot(updated), summary: projectSummary(req.params.projectId) });
});

app.get("/api/projects/:projectId/sync", requireClient(db), (req, res) => {
  const since = req.query.since || "1970-01-01T00:00:00.000Z";
  const orders = db.prepare("SELECT * FROM orders WHERE project_id = ? AND updated_at > ? ORDER BY updated_at ASC").all(req.params.projectId, since);
  const members = db.prepare("SELECT display_name, role, online, last_active_at, device_info, ip_address FROM project_members WHERE project_id = ? ORDER BY last_active_at DESC").all(req.params.projectId);
  res.json({ serverTime: nowIso(), orders: orders.map(orderSnapshot), members, summary: projectSummary(req.params.projectId) });
});

app.use(notFound);
app.use(errorHandler(db));

if (config.websocketEnabled) {
  const wss = new WebSocketServer({ server, path: config.websocketPath });
  wss.on("connection", (socket, req) => {
    const url = new URL(req.url, config.appBaseUrl);
    const projectId = url.searchParams.get("project_id");
    if (!projectId) {
      socket.close();
      return;
    }
    if (!projectSockets.has(projectId)) projectSockets.set(projectId, new Set());
    projectSockets.get(projectId).add(socket);
    socket.send(JSON.stringify({ type: "connected", projectId, serverTime: nowIso() }));
    socket.on("close", () => projectSockets.get(projectId)?.delete(socket));
  });
}

server.listen(config.port, () => {
  console.log(`${config.appName} backend listening on ${config.port}`);
});
