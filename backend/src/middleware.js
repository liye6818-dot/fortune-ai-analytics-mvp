import { hashSessionToken, nowIso } from "./security.js";
import { writeAuditLog } from "./logger.js";

export function requireAdmin(db) {
  return (req, res, next) => {
    const auth = String(req.get("authorization") || "");
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "admin_auth_required" });
    const session = db.prepare(`
      SELECT s.*, a.username, a.status AS admin_status
      FROM sessions s
      JOIN admin_users a ON a.id = s.admin_user_id
      WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
    `).get(hashSessionToken(token), nowIso());
    if (!session || session.mode !== "admin" || session.admin_status !== "active") {
      return res.status(401).json({ error: "admin_auth_required" });
    }
    const csrf = req.get("x-csrf-token");
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && hashSessionToken(csrf || "") !== session.csrf_token_hash) {
      return res.status(403).json({ error: "csrf_failed" });
    }
    req.admin = { id: session.admin_user_id, username: session.username, session };
    next();
  };
}

export function requireClient(db) {
  return (req, res, next) => {
    const auth = String(req.get("authorization") || "");
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    if (!token) return res.status(401).json({ error: "security_code_auth_required" });
    const session = db.prepare(`
      SELECT s.*, c.customer_name, c.enabled, c.deleted_at, c.permanent, c.expires_at AS code_expires_at
      FROM sessions s
      JOIN security_codes c ON c.id = s.security_code_id
      WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
    `).get(hashSessionToken(token), nowIso());
    if (!session || !session.enabled || session.deleted_at) {
      return res.status(401).json({ error: "security_code_auth_required" });
    }
    const csrf = req.get("x-csrf-token");
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && hashSessionToken(csrf || "") !== session.csrf_token_hash) {
      return res.status(403).json({ error: "csrf_failed" });
    }
    db.prepare("UPDATE sessions SET last_seen_at = ? WHERE id = ?").run(nowIso(), session.id);
    req.client = {
      securityCodeId: session.security_code_id,
      projectId: session.project_id,
      mode: session.mode,
      session
    };
    next();
  };
}

export function notFound(_req, res) {
  res.status(404).json({ error: "not_found" });
}

export function errorHandler(db) {
  return (error, req, res, _next) => {
    writeAuditLog(db, {
      actorType: req.admin ? "admin" : req.client ? "client" : "system",
      actorId: req.admin?.id || req.client?.securityCodeId || null,
      projectId: req.client?.projectId || null,
      securityCodeId: req.client?.securityCodeId || null,
      action: "exception",
      entityType: "request",
      entityId: req.originalUrl,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
      metadata: { message: error.message, stack: error.stack }
    });
    res.status(error.statusCode || 500).json({ error: error.message || "internal_error" });
  };
}
