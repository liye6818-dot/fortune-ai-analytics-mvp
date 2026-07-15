$ErrorActionPreference = "Stop"

$requiredProcesses = @("caishenye-admin", "caishenye-online")
$requiredFiles = @(
    "C:\Users\Administrator\Desktop\caishenye-online-server-20260709-153715\backend\.env",
    "C:\Users\Administrator\Desktop\caishenye-online-server-20260709-153715\database\runtime\production.sqlite",
    "C:\Sites\online\caishenye-online-server-20260709-153715\backend\.env",
    "C:\Sites\online\caishenye-online-server-20260709-153715\database\runtime\production.sqlite"
)
$urls = @(
    "https://caishenye88.com/",
    "https://online.caishenye88.com/",
    "https://pwa.caishenye88.com/"
)

$failed = $false
$processes = pm2 jlist | ConvertFrom-Json

foreach ($name in $requiredProcesses) {
    $process = $processes | Where-Object { $_.name -eq $name } | Select-Object -First 1
    if ($null -eq $process -or $process.pm2_env.status -ne "online") {
        Write-Host "[FAIL] PM2 process is not online: $name" -ForegroundColor Red
        $failed = $true
    } else {
        Write-Host "[OK] PM2 process: $name" -ForegroundColor Green
    }
}

foreach ($file in $requiredFiles) {
    if (Test-Path -LiteralPath $file) {
        $size = [math]::Round((Get-Item -LiteralPath $file).Length / 1KB, 1)
        Write-Host "[OK] Required file ($size KB): $file" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Missing required file: $file" -ForegroundColor Red
        $failed = $true
    }
}

foreach ($url in $urls) {
    try {
        $response = Invoke-WebRequest $url -UseBasicParsing -TimeoutSec 15
        if ($response.StatusCode -eq 200) {
            Write-Host "[OK] $url -> 200" -ForegroundColor Green
        } else {
            Write-Host "[FAIL] $url -> $($response.StatusCode)" -ForegroundColor Red
            $failed = $true
        }
    } catch {
        Write-Host "[FAIL] $url -> $($_.Exception.Message)" -ForegroundColor Red
        $failed = $true
    }
}

if ($failed) {
    Write-Host "Health check failed. Do not deploy or delete files." -ForegroundColor Red
    exit 1
}

Write-Host "All health checks passed." -ForegroundColor Green
exit 0
