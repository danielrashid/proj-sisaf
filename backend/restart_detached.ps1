# Reinício desacoplado: dispara restart_backend.ps1 num sub-shell oculto e retorna
# IMEDIATAMENTE (o uvicorn herda apenas arquivos de redirecionamento, nunca o pipe
# do terminal). Regra do projeto: imprimir o PID e prosseguir — não aguardar.
# Uso: .\\restart_detached.ps1
$ErrorActionPreference = "Stop"
$base = $PSScriptRoot
$out = Join-Path $env:TEMP "sisaf_restart_wrap_out.log"
$err = Join-Path $env:TEMP "sisaf_restart_wrap_err.log"
$stdin = Join-Path $env:TEMP "sisaf_restart_wrap_in.txt"
if (-not (Test-Path -LiteralPath $stdin)) { Set-Content -LiteralPath $stdin -Value "" -Encoding UTF8 }
$ps = Join-Path $env:WINDIR "System32\WindowsPowerShell\v1.0\powershell.exe"

$wrap = Start-Process -FilePath $ps `
    -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
        (Join-Path $base "restart_backend.ps1")) `
    -WorkingDirectory $base `
    -WindowStyle Hidden `
    -RedirectStandardOutput $out `
    -RedirectStandardError $err `
    -RedirectStandardInput $stdin `
    -PassThru

Write-Output "PID $($wrap.Id)"