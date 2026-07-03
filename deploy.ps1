param(
  [switch]$CheckOnly
)

$ErrorActionPreference = "Stop"

Write-Host "Fortune AI Analytics MVP - local preparation only"
Write-Host "This script does not deploy servers and does not modify production."

$required = @(
  "frontend",
  "backend",
  "database",
  "scripts",
  "docs",
  ".env.example",
  "README.md"
)

foreach ($path in $required) {
  if (-not (Test-Path -LiteralPath $path)) {
    throw "Missing required path: $path"
  }
}

if (-not (Test-Path -LiteralPath ".env")) {
  Write-Host "No .env found. Copy .env.example to .env before running backend locally."
}

Write-Host "Local structure check passed."

if ($CheckOnly) {
  exit 0
}

Write-Host "Next local steps:"
Write-Host "1. Copy .env.example to .env and fill secrets locally."
Write-Host "2. Run scripts/init-database.ps1 when ready to create a local SQLite database."
Write-Host "3. Do not upload .env, database/runtime, uploads, logs, or backups."
