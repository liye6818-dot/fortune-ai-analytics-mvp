param(
  [string]$SiteRoot = "C:\Sites\online\caishenye-online-server-20260709-153715"
)

$ErrorActionPreference = "Stop"
$frontend = Join-Path $SiteRoot "frontend"
$stylesPath = Join-Path $frontend "styles.css"
$indexPath = Join-Path $frontend "index.html"

if (-not (Test-Path -LiteralPath $stylesPath)) {
  throw "Missing online stylesheet: $stylesPath"
}

if (-not (Test-Path -LiteralPath $indexPath)) {
  throw "Missing online index: $indexPath"
}

$utf8NoBom = [Text.UTF8Encoding]::new($false)
$styles = [IO.File]::ReadAllText($stylesPath)
$replacements = [ordered]@{
  "--bg: #f4f6f8;" = "--bg: #eef8f1;"
  "--line: #d8dee6;" = "--line: #c9dfcf;"
  "--primary: #1668dc;" = "--primary: #168447;"
  "--violet: #5443e8;" = "--violet: #0f7a45;"
  "rgba(22, 104, 220, 0.12)" = "rgba(22, 132, 71, 0.16)"
  "rgba(22, 104, 220, 0.18)" = "rgba(22, 132, 71, 0.24)"
  "background: #eff6ff;" = "background: #ecfdf3;"
  "background: #0f766e;" = "background: #0f7a45;"
}

foreach ($entry in $replacements.GetEnumerator()) {
  $styles = $styles.Replace($entry.Key, $entry.Value)
}

[IO.File]::WriteAllText($stylesPath, $styles, $utf8NoBom)

$index = [IO.File]::ReadAllText($indexPath)
$index = [regex]::Replace(
  $index,
  'styles\.css\?v=[^"'']+',
  'styles.css?v=20260715_online_green1'
)
[IO.File]::WriteAllText($indexPath, $index, $utf8NoBom)

Write-Host "Online green theme applied."
Write-Host "Primary: #168447"
Write-Host "Danger actions remain red."
