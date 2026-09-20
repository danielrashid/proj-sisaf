# Smoke AdministraÃ§Ã£o â€” CRUD de usuÃ¡rios, unidades e permissÃµes (ativo/inativo).
# Uso: powershell -File .\smoke_admin.ps1
$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:8000"
$pass = "sisaf123"
$suf = Get-Random -Minimum 1000 -Maximum 9999

function Login([object]$cpf, [string]$senha = $pass) {
  $cpfStr = "$cpf"
  if ($cpfStr.Length -ne 11) { throw "CPF do login deve ter 11 digitos (era $($cpfStr.Length))" }
  $r = Invoke-RestMethod -Uri "$base/auth/login" -Method Post -Headers $ah0 -Body (@{ cpf = $cpfStr; senha = $senha } | ConvertTo-Json) -ContentType "application/json"
  return @{ token = $r.access_token }
}
function Headers($t) { @{ Authorization = "Bearer $t" } }

$adm = Login "11144477735"
$ah = Headers $adm.token
$atd = Login "12345678901"
$ahAtd = Headers $atd.token

$passos = 0
function Step($nome, $script) {
  try {
    & $script
    $script:passos++
    Write-Output ("OK   " + $nome)
  } catch {
    Write-Output ("FAIL " + $nome + " :: " + $_.Exception.Message)
    exit 1
  }
}

Step "atendimento nao acessa admin (403)" {
  try { Invoke-RestMethod -Uri "$base/admin/perfis" -Headers $ahAtd -ErrorAction Stop | Out-Null; throw "deveria ser 403" }
  catch {
    if ($_.Exception.Response.StatusCode.value__ -ne 403) { throw }
  }
}

Step "criar usuario" {
  $body = @{
    nome = "Analista Smoke $suf"
    email = "smoke$suf@sisaf.local"
    cpf = (10000000000 + $suf).ToString()
    senha = "smoke123"
    perfil_id = 1
    ativo = $true
    vinculos = @(@{ unidade_id = 1; especialidade_id = 1; cargo = "Analista"; ativo = $true })
    permissao_ids = @()
  } | ConvertTo-Json -Depth 6
  $r = Invoke-RestMethod -Uri "$base/admin/usuarios" -Method Post -Headers $ah -Body $body -ContentType "application/json"
  $script:novoUser = $r
  if ($r.email -ne "smoke$suf@sisaf.local") { throw "email divergente" }
  Write-Output "    id=$($r.id) perfil=$($r.perfil.codigo) vinculos=$($r.vinculos.Count)"
}

Step "novo usuario faz login" {
  $l = Login (10000000000 + $suf).ToString().ToString() "smoke123"
  if (-not $l.token) { throw "nao autenticou" }
}

Step "editar usuario (nome, perfil, ativo)" {
  $body2 = @{ nome = "Analista Smoke $suf editado"; ativo = $false; perfil_id = 2 } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$base/admin/usuarios/$($novoUser.id)" -Method Patch -Headers $ah -Body $body2 -ContentType "application/json"
  if ($r.ativo) { throw "deveria estar inativo" }
  if ($r.perfil_id -ne 2) { throw "perfil nao trocou" }
  Write-Output "    ativo=$($r.ativo) perfil=$($r.perfil.codigo)"
}

Step "usuario inativo nao faz login" {
  try { Login (10000000000 + $suf).ToString() "smoke123" | Out-Null; throw "deveria bloquear" }
  catch { if ($_.Exception.Response.StatusCode.value__ -ne 403) { throw } }
}

Step "reativar usuario" {
  $r = Invoke-RestMethod -Uri "$base/admin/usuarios/$($novoUser.id)" -Method Patch -Headers $ah -Body (@{ ativo = $true } | ConvertTo-Json) -ContentType "application/json"
  if (-not $r.ativo) { throw "nao reativou" }
}

Step "criar unidade" {
  $body = @{ nome = "Unidade Smoke $suf"; sigla = "SMK$suf"; unidade_pai_id = 1; ativo = $true; especialidade_ids = @(1) } | ConvertTo-Json -Depth 5
  $r = Invoke-RestMethod -Uri "$base/admin/unidades" -Method Post -Headers $ah -Body $body -ContentType "application/json"
  $script:unid = $r
  Write-Output "    sigla=$($r.sigla) pai=$($r.unidade_pai_id) modulos=$($r.especialidades.Count)"
}

Step "editar unidade (sigla, pai, ativo)" {
  $body2 = @{ sigla = "SMK${suf}X"; unidade_pai_id = $null; ativo = $false } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$base/admin/unidades/$($unid.id)" -Method Patch -Headers $ah -Body $body2 -ContentType "application/json"
  if ($r.ativo) { throw "deveria estar inativa" }
  if ($r.unidade_pai_id) { throw "pai deveria ser nulo" }
  Write-Output "    sigla=$($r.sigla) ativo=$($r.ativo) pai=$($r.unidade_pai_id)"
}

Step "criar permissao" {
  $body = @{ codigo = "smoke_$suf"; nome = "Permissao Smoke $suf" } | ConvertTo-Json
  $r = Invoke-RestMethod -Uri "$base/admin/permissoes" -Method Post -Headers $ah -Body $body -ContentType "application/json"
  if (-not $r.ativo) { throw "deveria nascer ativa" }
  $script:perm = $r
  Write-Output "    codigo=$($r.codigo) ativo=$($r.ativo)"
}

Step "editar permissao (nome, ativo)" {
  $r = Invoke-RestMethod -Uri "$base/admin/permissoes/$($perm.id)" -Method Patch -Headers $ah -Body (@{ nome = "Permissao $suf editada"; ativo = $false } | ConvertTo-Json) -ContentType "application/json"
  if ($r.ativo) { throw "deveria estar inativa" }
}

Step "atribuir permissao a perfis" {
  $r = Invoke-RestMethod -Uri "$base/admin/permissoes/$($perm.id)/perfis" -Method Put -Headers $ah -Body (@{ perfil_ids = @(1, 3) } | ConvertTo-Json) -ContentType "application/json"
  if ($r.perfil_ids -join "," -ne "1,3") { throw "perfis divergentes: $($r.perfil_ids -join ',')" }
  $script:perm = $r
}

Step "reativar permissao e conferir logs" {
  Invoke-RestMethod -Uri "$base/admin/permissoes/$($perm.id)" -Method Patch -Headers $ah -Body (@{ ativo = $true } | ConvertTo-Json) -ContentType "application/json" | Out-Null
  $logs = Invoke-RestMethod -Uri "$base/log?entidade=permissao&entidade_id=$($perm.id)" -Headers $ah
  Write-Output "    logs permissao=$($logs.Count)"
}

Write-Output "SMOKE ADMIN OK ($($passos) passos)"
