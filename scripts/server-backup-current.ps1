param(
    [string]$DestinationRoot = "C:\Sites\backups"
)

$ErrorActionPreference = "Stop"
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$destination = Join-Path $DestinationRoot "stable-$stamp"
$adminSource = "C:\Users\Administrator\Desktop\caishenye-online-server-20260709-153715"
$onlineSource = "C:\Sites\online\caishenye-online-server-20260709-153715"

foreach ($source in @($adminSource, $onlineSource)) {
    if (-not (Test-Path -LiteralPath $source)) {
        throw "Required source directory does not exist: $source"
    }
}

New-Item -ItemType Directory -Path "$destination\admin", "$destination\online", "$destination\pm2" -Force | Out-Null

robocopy $adminSource "$destination\admin" /E /COPY:DAT /R:1 /W:1 /XD node_modules .git
if ($LASTEXITCODE -ge 8) { throw "Admin backup failed. Robocopy code: $LASTEXITCODE" }

robocopy $onlineSource "$destination\online" /E /COPY:DAT /R:1 /W:1 /XD node_modules .git
if ($LASTEXITCODE -ge 8) { throw "Online backup failed. Robocopy code: $LASTEXITCODE" }

Copy-Item "C:\Users\Administrator\.pm2\dump.pm2" "$destination\pm2\dump.pm2" -Force

$hashFile = "$destination\SHA256-files.csv"
Get-ChildItem $destination -Recurse -File |
    Where-Object { $_.FullName -ne $hashFile } |
    Get-FileHash -Algorithm SHA256 |
    Select-Object Path, Hash |
    Export-Csv $hashFile -NoTypeInformation -Encoding UTF8

$requiredBackupFiles = @(
    "$destination\admin\backend\.env",
    "$destination\admin\database\runtime\production.sqlite",
    "$destination\online\backend\.env",
    "$destination\online\database\runtime\production.sqlite",
    "$destination\pm2\dump.pm2"
)

$missing = $requiredBackupFiles | Where-Object { -not (Test-Path -LiteralPath $_) }
if ($missing) {
    throw "Backup verification failed. Missing: $($missing -join ', ')"
}

Write-Host "Backup completed and verified: $destination" -ForegroundColor Green
