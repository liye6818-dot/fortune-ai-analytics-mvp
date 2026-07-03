$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$node = "C:\Users\zhanh\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"

Write-Host "== Syntax check =="
& $node --check "$root\backend\src\server.js"
& $node --check "$root\backend\src\middleware.js"
& $node --check "$root\backend\src\security.js"
& $node --check "$root\backend\src\database.js"
& $node --check "$root\backend\src\logger.js"

Write-Host "== Schema check =="
$schema = Get-Content "$root\database\schema.sql" -Raw
foreach ($required in @(
  "security_codes",
  "projects",
  "project_members",
  "sessions",
  "orders",
  "order_revisions",
  "audit_logs",
  "journal_mode = WAL"
)) {
  if ($schema -notmatch $required) { throw "Missing schema item: $required" }
}

Write-Host "== API source check =="
$server = Get-Content "$root\backend\src\server.js" -Raw
foreach ($required in @(
  "/api/admin/login",
  "/api/admin/security-codes",
  "/api/auth/security-code",
  "/api/projects",
  "/api/session/heartbeat",
  "/api/projects/:projectId/sync",
  "WebSocketServer",
  "recordRevision",
  "projectSummary"
)) {
  if ($server -notmatch [regex]::Escape($required)) { throw "Missing API item: $required" }
}

Write-Host "== Admin page check =="
$admin = Get-Content "$root\backend\public\admin\index.html" -Raw
foreach ($required in @("/api/admin/login", "/api/admin/security-codes", "/api/admin/projects", "/api/admin/logs", "createCode", "loadProjects")) {
  if ($admin -notmatch [regex]::Escape($required)) { throw "Missing admin item: $required" }
}

Write-Host "== Sensitive file check =="
$blockedFiles = Get-ChildItem -Path $root -Recurse -Force -File |
  Where-Object {
    $_.FullName -notmatch "\\.git\\" -and
    $_.FullName -notmatch "\\.pnpm-store\\" -and
    $_.FullName -notmatch "\\backups\\" -and
    ($_.Name -eq ".env" -or $_.Name -match "\.(db|sqlite|sqlite3|db-wal|db-shm)$")
  }
if ($blockedFiles) {
  $blockedFiles | Select-Object FullName
  throw "Blocked sensitive files found."
}

Write-Host "PHASE2_STATIC_TEST_OK"
