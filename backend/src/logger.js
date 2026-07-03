export function writeAuditLog(db, event) {
  const payload = {
    project_id: event.projectId || event.workspaceId || null,
    security_code_id: event.securityCodeId || null,
    actor_type: event.actorType || "system",
    actor_id: event.actorId || null,
    action: event.action,
    entity_type: event.entityType || null,
    entity_id: event.entityId || null,
    ip_address: event.ipAddress || null,
    user_agent: event.userAgent || null,
    metadata_json: JSON.stringify(event.metadata || {}),
    created_at: new Date().toISOString()
  };

  db.prepare(`
    INSERT INTO audit_logs (
      project_id, security_code_id, actor_type, actor_id, action, entity_type, entity_id,
      ip_address, user_agent, metadata_json, created_at
    ) VALUES (
      @project_id, @security_code_id, @actor_type, @actor_id, @action, @entity_type, @entity_id,
      @ip_address, @user_agent, @metadata_json, @created_at
    )
  `).run(payload);
}

export function logError(db, error, context = {}) {
  writeAuditLog(db, {
    actorType: context.actorType || "system",
    actorId: context.actorId || null,
    projectId: context.projectId || context.workspaceId || null,
    securityCodeId: context.securityCodeId || null,
    action: "exception",
    entityType: context.entityType || null,
    entityId: context.entityId || null,
    ipAddress: context.ipAddress || null,
    userAgent: context.userAgent || null,
    metadata: {
      message: error?.message || String(error),
      stack: error?.stack || null,
      context
    }
  });
}
