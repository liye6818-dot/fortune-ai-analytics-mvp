PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS security_codes (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  code_preview TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  contact TEXT,
  remark TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  permanent INTEGER NOT NULL DEFAULT 0 CHECK (permanent IN (0, 1)),
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  login_count INTEGER NOT NULL DEFAULT 0,
  last_login_at TEXT,
  last_login_ip TEXT,
  online INTEGER NOT NULL DEFAULT 0 CHECK (online IN (0, 1)),
  created_by TEXT,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS standalone_keys (
  id TEXT PRIMARY KEY,
  key_hash TEXT NOT NULL UNIQUE,
  key_preview TEXT NOT NULL,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  expires_at TEXT,
  permanent INTEGER NOT NULL DEFAULT 0 CHECK (permanent IN (0, 1)),
  bound_device_id TEXT,
  bound_at TEXT,
  bound_ip TEXT,
  bound_user_agent TEXT,
  last_login_at TEXT,
  last_login_ip TEXT,
  last_user_agent TEXT,
  login_count INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  disabled_at TEXT,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  security_code_id TEXT NOT NULL REFERENCES security_codes(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('standalone', 'collaboration')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_by_member_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  security_code_id TEXT NOT NULL REFERENCES security_codes(id) ON DELETE RESTRICT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  display_name TEXT NOT NULL,
  joined_at TEXT NOT NULL,
  last_active_at TEXT,
  device_info TEXT,
  ip_address TEXT,
  online INTEGER NOT NULL DEFAULT 0 CHECK (online IN (0, 1)),
  UNIQUE (project_id, security_code_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  security_code_id TEXT REFERENCES security_codes(id) ON DELETE CASCADE,
  admin_user_id TEXT REFERENCES admin_users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  token_hash TEXT NOT NULL UNIQUE,
  csrf_token_hash TEXT NOT NULL,
  device_id TEXT,
  device_info TEXT,
  ip_address TEXT,
  mode TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  security_code_id TEXT NOT NULL REFERENCES security_codes(id) ON DELETE RESTRICT,
  created_by_member_id TEXT REFERENCES project_members(id) ON DELETE SET NULL,
  customer_name TEXT,
  region TEXT NOT NULL,
  play_type TEXT NOT NULL,
  content_json TEXT NOT NULL,
  amount REAL NOT NULL,
  odds REAL NOT NULL,
  rebate REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  profit REAL NOT NULL DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT,
  deleted_by_member_id TEXT REFERENCES project_members(id) ON DELETE SET NULL,
  delete_reason TEXT
);

CREATE TABLE IF NOT EXISTS order_revisions (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_member_id TEXT REFERENCES project_members(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'restore')),
  before_json TEXT,
  after_json TEXT,
  reason TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  security_code_id TEXT REFERENCES security_codes(id) ON DELETE SET NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_security_codes_status ON security_codes(enabled, deleted_at);
CREATE INDEX IF NOT EXISTS idx_standalone_keys_status ON standalone_keys(status, deleted_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_standalone_keys_bound ON standalone_keys(bound_device_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_projects_security ON projects(security_code_id, created_at);
CREATE INDEX IF NOT EXISTS idx_members_project ON project_members(project_id, online, last_active_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_security ON sessions(security_code_id, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_orders_project_created ON orders(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_project_deleted ON orders(project_id, deleted_at);
CREATE INDEX IF NOT EXISTS idx_revisions_order ON order_revisions(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_project_created ON audit_logs(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_security_created ON audit_logs(security_code_id, created_at);
