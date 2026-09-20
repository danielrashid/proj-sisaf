$ErrorActionPreference = "Stop"
$base = $PSScriptRoot
$py = Join-Path $base ".venv\Scripts\python.exe"
$out = Join-Path $base "uvicorn.out.log"
$err = Join-Path $base "uvicorn.err.log"
$nullFile = Join-Path $base "stdin.nul"
$pidFile = Join-Path $base "server.pid"

if (!(Test-Path $nullFile)) { New-Item -ItemType File -Path $nullFile -Force | Out-Null }

if (Test-Path $pidFile) {
    $old = Get-Content $pidFile
    if ($old -and (Get-Process -Id $old -ErrorAction SilentlyContinue)) {
        Stop-Process -Id $old -Force
        Start-Sleep -Milliseconds 800
    }
}

$p = Start-Process -FilePath $py `
    -ArgumentList @("-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload") `
    -WorkingDirectory $base `
    -RedirectStandardOutput $out `
    -RedirectStandardError $err `
    -RedirectStandardInput $nullFile `
    -PassThru `
    -WindowStyle Hidden

Set-Content -Path $pidFile -Value $p.Id
Write-Output "PID $($p.Id)"

# Desvincula o handle do processo para o terminal fechar na hora
$p.Dispose()