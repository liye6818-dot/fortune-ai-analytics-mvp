$ErrorActionPreference = "Stop"

$blockedPatterns = @(
  ".env",
  "*.sqlite",
  "*.sqlite3",
  "*.db",
  "*.db-wal",
  "*.db-shm"
)

$blockedDirs = @(
  "uploads",
  "logs",
  "backups",
  "tmp",
  "temp",
  "cache",
  ".cache",
  "customer-security-codes",
  "security-codes",
  "client-secrets"
)

Write-Host "Running preflight check..."

foreach ($pattern in $blockedPatterns) {
  $matches = Get-ChildItem -Recurse -Force -File -Filter $pattern -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch "\\.git\\" }
  if ($matches) {
    Write-Host "Blocked files found for pattern: $pattern" -ForegroundColor Red
    $matches | Select-Object FullName
    throw "Preflight failed."
  }
}

foreach ($dir in $blockedDirs) {
  if (Test-Path -LiteralPath $dir) {
    Write-Host "Runtime/private directory exists and must not be committed: $dir" -ForegroundColor Yellow
  }
}

if (-not (Test-Path -LiteralPath ".gitignore")) {
  throw "Missing .gitignore"
}

Write-Host "Preflight check finished. Review Git status before committing."
