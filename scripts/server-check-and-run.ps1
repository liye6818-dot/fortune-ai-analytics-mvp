param(
  [string]$Root = "C:\Apps\caishenye88",
  [int]$Port = 3000,
  [string]$PublicBaseUrl = "https://caishenye88.com"
)

$ErrorActionPreference = "Stop"

function Step($Name) {
  Write-Host ""
  Write-Host "== $Name =="
}

function Fail($Name, $ErrorRecord) {
  Write-Host ""
  Write-Host "FAILED: $Name" -ForegroundColor Red
  Write-Host $ErrorRecord.Exception.Message -ForegroundColor Red
  Write-Host "Log: $script:LogFile"
  exit 1
}

if (!(Test-Path $Root)) {
  throw "Project folder not found: $Root"
}

$LogDir = Join-Path $Root "logs"
New-Item -ItemType Directory -Force $LogDir | Out-Null
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
$script:LogFile = Join-Path $LogDir "server-check-and-run_$Stamp.log"
Start-Transcript -Path $script:LogFile -Force | Out-Null

try {
  Step "Runtime checks"
  $tools = @("node", "npm", "git", "python")
  foreach ($tool in $tools) {
    $cmd = Get-Command $tool -ErrorAction SilentlyContinue
    if ($cmd) {
      Write-Host "${tool}: $($cmd.Source)"
      if ($tool -eq "node") { node -v }
      if ($tool -eq "npm") { npm -v }
      if ($tool -eq "git") { git --version }
      if ($tool -eq "python") { python --version }
    } else {
      Write-Host "${tool}: not found"
    }
  }
  if (!(Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js is required" }
  if (!(Get-Command npm -ErrorAction SilentlyContinue)) { throw "npm is required" }

  Step "Project files"
  Set-Location $Root
  foreach ($required in @(".env", "backend\package.json", "backend\src\server.js", "database\schema.sql")) {
    if (!(Test-Path $required)) { throw "Missing $required" }
    Write-Host "OK $required"
  }

  Step ".env checks"
  $envText = Get-Content ".env" -Raw
  foreach ($name in @("APP_BASE_URL", "ADMIN_USERNAME", "ADMIN_PASSWORD_HASH", "SESSION_SECRET", "DATABASE_URL", "SECURITY_CODE_PEPPER")) {
    if ($envText -notmatch "(?m)^$name=.+") { throw "Missing or empty .env value: $name" }
    Write-Host "OK $name"
  }

  Step "Install backend dependencies"
  Set-Location (Join-Path $Root "backend")
  npm install

  Step "Port check"
  $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  if ($listener) {
    Write-Host "Port $Port is already listening. Stopping node processes that own this port."
    foreach ($conn in $listener) {
      $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
      if ($proc -and $proc.ProcessName -eq "node") {
        Stop-Process -Id $proc.Id -Force
      } else {
        throw "Port $Port is occupied by $($proc.ProcessName) pid $($conn.OwningProcess)"
      }
    }
  } else {
    Write-Host "Port $Port is free"
  }

  Step "Start backend"
  Set-Location $Root
  $OutLog = Join-Path $LogDir "node.out.log"
  $ErrLog = Join-Path $LogDir "node.err.log"
  Start-Process -FilePath "node" `
    -ArgumentList "backend\src\server.js" `
    -WorkingDirectory $Root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $OutLog `
    -RedirectStandardError $ErrLog

  Start-Sleep -Seconds 3
  $health = Invoke-RestMethod "http://127.0.0.1:$Port/health"
  Write-Host "Health: $($health | ConvertTo-Json -Compress)"

  Step "Access URLs"
  Write-Host "Local health: http://127.0.0.1:$Port/health"
  Write-Host "Local admin:  http://127.0.0.1:$Port/admin/"
  Write-Host "Public site:  $PublicBaseUrl/"
  Write-Host "Public admin: $PublicBaseUrl/admin/"
  Write-Host "Node stdout:  $OutLog"
  Write-Host "Node stderr:  $ErrLog"
  Write-Host "Script log:   $script:LogFile"
} catch {
  Fail "server-check-and-run" $_
} finally {
  Stop-Transcript | Out-Null
}
