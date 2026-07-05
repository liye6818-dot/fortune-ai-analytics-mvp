param(
  [string]$SitePath = "",
  [string]$BackendPath = "",
  [int]$BackendPort = 3000,
  [switch]$NoRestart
)

$ErrorActionPreference = "Stop"

$Version = "20260706_parse_single_device"
$SourceRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceBackendServer = Join-Path $SourceRoot "backend\src\server.js"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupRoot = "C:\DeployBackups\caishenye88_$Version`_$Stamp"

function Step($Text) {
  Write-Host ""
  Write-Host "=== $Text ===" -ForegroundColor Cyan
}

function RequireFile($Path, $Label) {
  if (!(Test-Path -LiteralPath $Path)) {
    throw "Missing $Label`: $Path"
  }
}

function FindSite {
  $candidates = @(
    "C:\Sites\caishenye88",
    "C:\inetpub\wwwroot\caishenye88",
    "C:\inetpub\wwwroot",
    "D:\Sites\caishenye88",
    "D:\inetpub\wwwroot\caishenye88"
  )
  foreach ($p in $candidates) {
    if ((Test-Path -LiteralPath (Join-Path $p "index.html")) -and
        ((Test-Path -LiteralPath (Join-Path $p "app.js")) -or (Test-Path -LiteralPath (Join-Path $p "main.js")))) {
      return $p
    }
  }
  return ""
}

function FindBackend {
  $candidates = @(
    "C:\Apps\caishenye88-backend\backend",
    "C:\Apps\caishenye88-api",
    "C:\Apps\caishenye88\backend",
    "C:\Sites\caishenye88-backend\backend",
    "D:\Apps\caishenye88-backend\backend",
    "D:\Apps\caishenye88-api"
  )
  foreach ($p in $candidates) {
    if (Test-Path -LiteralPath (Join-Path $p "src\server.js")) {
      return $p
    }
  }
  return ""
}

function NodePath {
  $direct = "C:\Program Files\nodejs\node.exe"
  if (Test-Path -LiteralPath $direct) { return $direct }
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  throw "Node.js was not found."
}

Step "Check source"
RequireFile (Join-Path $SourceRoot "index.html") "source index.html"
RequireFile (Join-Path $SourceRoot "app.js") "source app.js"
RequireFile (Join-Path $SourceRoot "main.js") "source main.js"
RequireFile (Join-Path $SourceRoot "config.js") "source config.js"
RequireFile $SourceBackendServer "source backend server.js"

if ((Get-Content -LiteralPath (Join-Path $SourceRoot "app.js") -Raw) -notmatch "parseCommaAmountStream") {
  throw "Source app.js does not include the new parse logic."
}
if ((Get-Content -LiteralPath $SourceBackendServer -Raw) -notmatch "revokeActiveClientSessionsForSecurityCode") {
  throw "Source backend server.js does not include single-device login."
}

if (!$SitePath) { $SitePath = FindSite }
if (!$SitePath) { $SitePath = Read-Host "Enter site folder, example C:\Sites\caishenye88" }
if (!$BackendPath) { $BackendPath = FindBackend }
if (!$BackendPath) { $BackendPath = Read-Host "Enter backend folder, example C:\Apps\caishenye88-backend\backend" }

$TargetServer = Join-Path $BackendPath "src\server.js"

Step "Check target"
RequireFile (Join-Path $SitePath "index.html") "target index.html"
RequireFile $TargetServer "target backend server.js"
Write-Host "Site:    $SitePath"
Write-Host "Backend: $BackendPath"
Write-Host "Backup:  $BackupRoot"

Step "Backup"
New-Item -ItemType Directory -Force -Path $BackupRoot | Out-Null
$BackupSite = Join-Path $BackupRoot "site"
$BackupBackend = Join-Path $BackupRoot "backend-src"
New-Item -ItemType Directory -Force -Path $BackupSite | Out-Null
New-Item -ItemType Directory -Force -Path $BackupBackend | Out-Null

foreach ($name in @("index.html", "app.js", "main.js", "styles.css", "config.js", "pwa.js", "sw.js")) {
  $target = Join-Path $SitePath $name
  if (Test-Path -LiteralPath $target) {
    Copy-Item -LiteralPath $target -Destination (Join-Path $BackupSite $name) -Force
  }
}
Copy-Item -LiteralPath $TargetServer -Destination (Join-Path $BackupBackend "server.js") -Force

Step "Update site files"
foreach ($name in @("index.html", "app.js", "main.js", "styles.css", "config.js", "pwa.js", "sw.js", "manifest.json", "offline.html")) {
  $source = Join-Path $SourceRoot $name
  if (Test-Path -LiteralPath $source) {
    Copy-Item -LiteralPath $source -Destination (Join-Path $SitePath $name) -Force
    Write-Host "Updated $name"
  }
}

Step "Update backend"
Copy-Item -LiteralPath $SourceBackendServer -Destination $TargetServer -Force

Step "Check backend syntax"
$node = NodePath
& $node --check $TargetServer

if ((Get-Content -LiteralPath (Join-Path $SitePath "app.js") -Raw) -notmatch "parseCommaAmountStream") {
  throw "Target app.js missing new parse logic after copy."
}
if ((Get-Content -LiteralPath $TargetServer -Raw) -notmatch "revokeActiveClientSessionsForSecurityCode") {
  throw "Target backend missing single-device login after copy."
}

if (!$NoRestart) {
  Step "Restart backend"
  $connections = Get-NetTCPConnection -LocalPort $BackendPort -State Listen -ErrorAction SilentlyContinue
  foreach ($conn in $connections) {
    try {
      Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
      Write-Host "Stopped process $($conn.OwningProcess) on port $BackendPort"
    } catch {}
  }

  $backendRoot = Split-Path -Parent $BackendPath
  $startScript = @(
    (Join-Path $backendRoot "start-backend.ps1"),
    (Join-Path $BackendPath "start-backend.ps1")
  ) | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

  if ($startScript) {
    Start-Process powershell.exe -WindowStyle Hidden -ArgumentList "-ExecutionPolicy Bypass -File `"$startScript`""
    Write-Host "Started backend with $startScript"
  } else {
    Start-Process powershell.exe -WindowStyle Hidden -WorkingDirectory $BackendPath -ArgumentList "-ExecutionPolicy Bypass -Command `"node src\server.js`""
    Write-Host "Started backend with node src\server.js"
  }

  Start-Sleep -Seconds 3

  Step "Restart IIS if installed"
  if (Get-Command iisreset.exe -ErrorAction SilentlyContinue) {
    & iisreset.exe
  } else {
    Write-Host "IIS not found, skipped."
  }
}

Step "Done"
Write-Host "Parse update: OK"
Write-Host "Single-device security code login: OK"
Write-Host "Backup: $BackupRoot"
Write-Host "Test URL: https://caishenye88.com/?v=$Version"
