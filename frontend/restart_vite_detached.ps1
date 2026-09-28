$ErrorActionPreference = "Stop"
$dir = "G:\proj-sisaf\frontend"
$logOut = "$dir\vite.out.log"
$logErr = "$dir\vite.err.log"
$pidF   = "$dir\vite.pid"
if (Test-Path $pidF) { $old = Get-Content $pidF -ErrorAction SilentlyContinue; if ($old) { Get-Process -Id $old -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue } }
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "cd /d `"$dir`" && npm run dev -- --port 5173 >> `"$logOut`" 2>> `"$logErr`"" -WindowStyle Hidden -RedirectStandardInput "$dir\stdin.nul" -PassThru | Select-Object -ExpandProperty Id | Set-Content $pidF
