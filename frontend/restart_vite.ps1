$ErrorActionPreference = "Stop"
$base = $PSScriptRoot
$node = "node.exe"
$vite = Join-Path $base "node_modules\vite\bin\vite.js"
$out = Join-Path $base "vite.out.log"
$err = Join-Path $base "vite.err.log"
$nullFile = Join-Path $base "stdin.nul"
$pidFile = Join-Path $base "vite.pid"

if (!(Test-Path $nullFile)) { New-Item -ItemType File -Path $nullFile -Force | Out-Null }

if (Test-Path $pidFile) {
    $old = Get-Content $pidFile
    if ($old -and (Get-Process -Id $old -ErrorAction SilentlyContinue)) {
        Stop-Process -Id $old -Force
        Start-Sleep -Milliseconds 800
    }
}

$p = Start-Process -FilePath $node `
    -ArgumentList @($vite, "--port", "5173") `
    -WorkingDirectory $base `
    -RedirectStandardOutput $out `
    -RedirectStandardError $err `
    -RedirectStandardInput $nullFile `
    -PassThru `
    -WindowStyle Hidden

Set-Content -Path $pidFile -Value $p.Id
Write-Output "VITE PID $($p.Id)"