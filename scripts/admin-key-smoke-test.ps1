param(
  [string]$BaseUrl = "http://127.0.0.1:3000",
  [string]$AdminUsername = "admin",
  [Parameter(Mandatory = $true)]
  [string]$AdminPassword,
  [string]$LogDir = "C:\Apps\caishenye88\logs"
)

$ErrorActionPreference = "Stop"
$Stamp = Get-Date -Format "yyyyMMdd_HHmmss"
New-Item -ItemType Directory -Force $LogDir | Out-Null
$LogPath = Join-Path $LogDir "admin-key-smoke-test_$Stamp.log"
Start-Transcript -Path $LogPath -Append | Out-Null

$results = New-Object System.Collections.Generic.List[object]
$adminHeaders = @{}

function Add-Result {
  param([string]$Name, [string]$Result, [string]$Details = "")
  $results.Add([pscustomobject]@{
    Test = $Name
    Result = $Result
    Details = $Details
  }) | Out-Null
}

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Path,
    [object]$Body = $null,
    [hashtable]$Headers = @{}
  )

  $uri = "$($BaseUrl.TrimEnd('/'))$Path"
  $params = @{
    Method = $Method
    Uri = $uri
    UseBasicParsing = $true
    Headers = $Headers
  }
  if ($null -ne $Body) {
    $params.ContentType = "application/json"
    $params.Body = ($Body | ConvertTo-Json -Depth 8)
  }

  try {
    $response = Invoke-WebRequest @params
    $json = $null
    if ($response.Content) {
      try { $json = $response.Content | ConvertFrom-Json } catch { $json = $response.Content }
    }
    return [pscustomobject]@{
      Ok = $true
      Status = [int]$response.StatusCode
      Body = $json
      Raw = $response.Content
      Uri = $uri
    }
  } catch {
    $status = 0
    $raw = ""
    if ($_.Exception.Response) {
      $status = [int]$_.Exception.Response.StatusCode
      try {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $raw = $reader.ReadToEnd()
      } catch {
        $raw = $_.Exception.Message
      }
    } else {
      $raw = $_.Exception.Message
    }
    $body = $raw
    try { $body = $raw | ConvertFrom-Json } catch {}
    return [pscustomobject]@{
      Ok = $false
      Status = $status
      Body = $body
      Raw = $raw
      Uri = $uri
    }
  }
}

function Assert-True {
  param([bool]$Condition, [string]$Name, [string]$Details)
  if ($Condition) {
    Add-Result $Name "PASS" $Details
  } else {
    Add-Result $Name "FAIL" $Details
    throw "$Name failed: $Details"
  }
}

try {
  Write-Host "Smoke test base URL: $BaseUrl"
  Write-Host "Log path: $LogPath"

  $adminPage = Invoke-Json -Method "GET" -Path "/admin/"
  Assert-True ($adminPage.Status -eq 200 -and "$($adminPage.Raw)" -match "管理后台") "后台登录页" "HTTP $($adminPage.Status)"

  $login = Invoke-Json -Method "POST" -Path "/api/admin/login" -Body @{
    username = $AdminUsername
    password = $AdminPassword
  }
  Assert-True ($login.Status -eq 200 -and $login.Body.token) "管理员登录" "HTTP $($login.Status)"

  $adminHeaders = @{
    Authorization = "Bearer $($login.Body.token)"
    "x-csrf-token" = "$($login.Body.csrfToken)"
  }

  $stampKey = Get-Date -Format "yyyyMMddHHmmss"
  $plainKey = "SK-$stampKey-$((Get-Random -Minimum 100000 -Maximum 999999))"
  $create = Invoke-Json -Method "POST" -Path "/api/admin/standalone-keys" -Headers $adminHeaders -Body @{
    key = $plainKey
    note = "smoke test $stampKey"
    duration = "365"
  }
  Assert-True ($create.Status -eq 201 -and $create.Body.item.id) "创建单机密钥" "HTTP $($create.Status), id=$($create.Body.item.id)"
  $keyId = $create.Body.item.id

  $deviceA = "smoke-device-A-$stampKey"
  $deviceB = "smoke-device-B-$stampKey"

  $loginA1 = Invoke-Json -Method "POST" -Path "/api/auth/standalone-key" -Body @{
    key = $plainKey
    deviceId = $deviceA
    deviceInfo = "smoke-test-device-A"
  }
  Assert-True ($loginA1.Status -eq 200 -and $loginA1.Body.ok) "首次登录绑定设备" "HTTP $($loginA1.Status)"

  $loginA2 = Invoke-Json -Method "POST" -Path "/api/auth/standalone-key" -Body @{
    key = $plainKey
    deviceId = $deviceA
    deviceInfo = "smoke-test-device-A-again"
  }
  Assert-True ($loginA2.Status -eq 200 -and $loginA2.Body.ok) "同设备再次登录" "HTTP $($loginA2.Status)"

  $loginB1 = Invoke-Json -Method "POST" -Path "/api/auth/standalone-key" -Body @{
    key = $plainKey
    deviceId = $deviceB
    deviceInfo = "smoke-test-device-B"
  }
  Assert-True ($loginB1.Status -eq 403 -and $loginB1.Raw -match "standalone_key_bound_to_other_device") "不同设备被拒绝" "HTTP $($loginB1.Status), $($loginB1.Raw)"

  $reset = Invoke-Json -Method "POST" -Path "/api/admin/standalone-keys/$keyId/reset-device" -Headers $adminHeaders
  Assert-True ($reset.Status -eq 200) "后台重置设备绑定" "HTTP $($reset.Status)"

  $loginB2 = Invoke-Json -Method "POST" -Path "/api/auth/standalone-key" -Body @{
    key = $plainKey
    deviceId = $deviceB
    deviceInfo = "smoke-test-device-B-after-reset"
  }
  Assert-True ($loginB2.Status -eq 200 -and $loginB2.Body.ok) "重置后新设备登录" "HTTP $($loginB2.Status)"

  $disable = Invoke-Json -Method "PATCH" -Path "/api/admin/standalone-keys/$keyId" -Headers $adminHeaders -Body @{
    enabled = $false
  }
  Assert-True ($disable.Status -eq 200) "后台禁用密钥" "HTTP $($disable.Status)"

  $disabledLogin = Invoke-Json -Method "POST" -Path "/api/auth/standalone-key" -Body @{
    key = $plainKey
    deviceId = $deviceB
    deviceInfo = "smoke-test-disabled"
  }
  Assert-True ($disabledLogin.Status -eq 403 -and $disabledLogin.Raw -match "standalone_key_disabled") "禁用密钥被拒绝" "HTTP $($disabledLogin.Status), $($disabledLogin.Raw)"

  $expiredKey = "SK-EXPIRED-$stampKey-$((Get-Random -Minimum 100000 -Maximum 999999))"
  $expiredCreate = Invoke-Json -Method "POST" -Path "/api/admin/standalone-keys" -Headers $adminHeaders -Body @{
    key = $expiredKey
    note = "smoke expired $stampKey"
    duration = "custom"
    customExpiresAt = "2020-01-01T00:00:00.000Z"
  }
  Assert-True ($expiredCreate.Status -eq 201) "创建过期密钥" "HTTP $($expiredCreate.Status)"

  $expiredLogin = Invoke-Json -Method "POST" -Path "/api/auth/standalone-key" -Body @{
    key = $expiredKey
    deviceId = "smoke-expired-device-$stampKey"
    deviceInfo = "smoke-test-expired"
  }
  Assert-True ($expiredLogin.Status -eq 403 -and $expiredLogin.Raw -match "standalone_key_expired") "过期密钥被拒绝" "HTTP $($expiredLogin.Status), $($expiredLogin.Raw)"

  $home = Invoke-Json -Method "GET" -Path "/"
  Assert-True ($home.Status -eq 200 -and "$($home.Raw)" -match "单机模式") "现有单机入口页面" "HTTP $($home.Status)"

  Write-Host ""
  Write-Host "Smoke test results:"
  $results | Format-Table -AutoSize
  Write-Host ""
  Write-Host "全部通过。日志：$LogPath"
} catch {
  Write-Host ""
  Write-Host "Smoke test failed: $($_.Exception.Message)"
  Write-Host "日志：$LogPath"
  Write-Host ""
  $results | Format-Table -AutoSize
  throw
} finally {
  Stop-Transcript | Out-Null
}
