param(
    [Parameter(Mandatory = $true)]
    [string]$BackupPath,

    [Parameter(Mandatory = $true)]
    [ValidateSet("RESTORE-CODE")]
    [string]$Confirm
)

$ErrorActionPreference = "Stop"
$adminTarget = "C:\Users\Administrator\Desktop\caishenye-online-server-20260709-153715"
$onlineTarget = "C:\Sites\online\caishenye-online-server-20260709-153715"
$adminBackup = Join-Path $BackupPath "admin"
$onlineBackup = Join-Path $BackupPath "online"

foreach ($path in @($adminBackup, $onlineBackup, $adminTarget, $onlineTarget)) {
    if (-not (Test-Path -LiteralPath $path)) {
        throw "Required directory does not exist: $path"
    }
}

Write-Host "Restoring application code only." -ForegroundColor Yellow
Write-Host "Databases and .env files will not be overwritten." -ForegroundColor Yellow

robocopy $adminBackup $adminTarget /E /COPY:DAT /R:1 /W:1 /XD node_modules .git database /XF .env
if ($LASTEXITCODE -ge 8) { throw "Admin code restore failed. Robocopy code: $LASTEXITCODE" }

robocopy $onlineBackup $onlineTarget /E /COPY:DAT /R:1 /W:1 /XD node_modules .git database /XF .env
if ($LASTEXITCODE -ge 8) { throw "Online code restore failed. Robocopy code: $LASTEXITCODE" }

node --check "$adminTarget\backend\src\server.js"
node --check "$onlineTarget\backend\src\server.js"

pm2 restart caishenye-admin --update-env
pm2 restart caishenye-online --update-env
pm2 save

Write-Host "Code restore completed. Run server-health-check.ps1 now." -ForegroundColor Green
