param(
  [string]$DatabasePath = ""
)

$ErrorActionPreference = "Stop"

if (-not $DatabasePath) {
  $databaseUrl = $env:DATABASE_URL
  if ($databaseUrl -and $databaseUrl.StartsWith("sqlite:")) {
    $DatabasePath = $databaseUrl.Substring("sqlite:".Length)
  }
}

if (-not $DatabasePath) {
  throw "Database path is required. Set DATABASE_URL in .env/environment or pass -DatabasePath."
}

$runtimeDir = Split-Path -Parent $DatabasePath
if (-not (Test-Path -LiteralPath $runtimeDir)) {
  New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
}

Write-Host "SQLite initialization is reserved for local backend setup."
Write-Host "Database path: $DatabasePath"
Write-Host "Schema file: .\database\schema.sql"
Write-Host "Reminder: database/runtime is ignored by Git."
