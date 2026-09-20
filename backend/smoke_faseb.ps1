# Smoke test Fase B: Ouvidoria -> caixa -> distribuicao -> retorno -> PFO.
# Regra: corpos em ASCII (Invoke-RestMethod 5.1 envia acentos em ANSI e quebra o JSON).
$ErrorActionPreference = "Stop"
$base = "http://127.0.0.1:8000"
$pass = "sisaf123"

function Login($cpf) {
  $r = Invoke-RestMethod -Uri "$base/auth/login" -Method Post `
    -Body (@{ cpf = $cpf; senha = $pass } | ConvertTo-Json) -ContentType "application/json"
  return @{ token = $r.access_token; usr = $r.usuario }
}
function Headers($t) { @{ Authorization = "Bearer $t" } }

# PS 5.1 quirk: @(Invoke-RestMethod ...) pode agregar o array num unico objeto.
# Esses helpers garantem listas de verdade.
function Get-Arr($path, $h) {
  $r = Invoke-RestMethod -Uri "$base$path" -Headers $h
  if ($null -eq $r) { return @() }
  if ($r -is [System.Array]) { return $r }
  return @($r)
}

function Step($nome, $scriptBlock) {
  try {
    & $scriptBlock
    Write-Output "OK   $nome"
  } catch {
    Write-Output "FAIL $nome :: $($_.Exception.Message)"
    exit 1
  }
}

$lid = Login "12131415160"          # Lidia - Ouvidoria (permissao caixa_ouvidorias)
$bea = Login "33366699957"          # Beatriz - chefe UFOPE (permissao caixa_ouvidorias)
$lh = Headers $lid.token
$bh = Headers $bea.token

# 0) descobrir unidades, especialidade e auditores
$todasUnid = Get-Arr "/unidades" $bh
$unidades = @{}
foreach ($u in $todasUnid) { $unidades[$u.sigla] = $u.id }
$ufopeId = $unidades["UFOPE"]
$ouvId = $unidades["OUV"]
Write-Output "unidades: UFOPE=$ufopeId OUV=$ouvId"

# subarvore da UFOPE (inclui subsidiarias) para escolher auditores no alcance
$sub = @($ufopeId)
do {
  $novas = @($todasUnid | Where-Object { $_.unidade_pai_id -in $sub -and $_.id -notin $sub } | ForEach-Object { $_.id })
  if ($novas.Count -gt 0) { $sub += $novas }
} while ($novas.Count -gt 0)
Write-Output "subarvore UFOPE: $($sub -join ',')"

$espId = ((Invoke-RestMethod -Uri "$base/especialidades" -Headers $bh) | Where-Object { $_.sigla -eq "AEU" }).id
Write-Output "especialidade AEU id=$espId"

$auditores = @(Get-Arr "/usuarios" $bh | Where-Object {
    $_.perfil.codigo -eq "auditor_campo" -and $_.ativo -and
    ($_.vinculos | Where-Object { $_.unidade_id -in $sub })
  })
if ($auditores.Count -lt 2) { throw "Preciso de 2 auditores de campo ativos na subarvore UFOPE para o teste" }
$aud1 = $auditores[0]
$aud2 = $auditores[1]
Write-Output "auditores: $($aud1.nome) (id $($aud1.id) cpf $($aud1.cpf)) / $($aud2.nome) (id $($aud2.id))"
$a1 = Login $aud1.cpf; $ah1 = Headers $a1.token
$a2 = Login $aud2.cpf; $ah2 = Headers $a2.token

# 1) Lidia cria OUV encaminhada a UFOPE
$ouvidoria1 = $null
Step "criar OUV (Lidia->UFOPE)" {
  $body = @{
    origem = "ouvidoria"; tema = "Denuncia terreno baldio (smoke)"; ra = "Ceilandia";
    endereco = "QNM 12"; raio_geo = 60; prazo_data = "2026-10-01";
    descricao = "Manifestacao via Participa - teste automatizado";
    frentes = @(@{ especialidade_id = $espId; descricao = "Verificacao" });
    auditores = @();
    unidade_responsavel_id = $ufopeId
  } | ConvertTo-Json -Depth 5
  $ouvidoria1 = Invoke-RestMethod -Uri "$base/os" -Method Post -Headers $lh -Body $body -ContentType "application/json"
  $script:ouvidoria1 = $ouvidoria1
  Write-Output "    criada: $($ouvidoria1.codigo) id=$($ouvidoria1.id) caixa=$($ouvidoria1.caixa_estado)"
}

# 2) Beatriz ve a caixa da UFOPE
Step "caixa UFOPE (Beatriz)" {
  $caixa = Get-Arr "/os/caixa-ouvidorias" $bh
  $it = $caixa | Where-Object { $_.id -eq $ouvidoria1.id }
  if (-not $it) { throw "OUV nao esta na caixa da UFOPE" }
  Write-Output "    encontrada: $($it.codigo) estado=$($it.caixa_estado)"
}

# 3) Beatriz distribui para auditor1
Step "distribuir (Beatriz)" {
  $d = @{ decisao = "redistribuir"; auditores = @(@{ usuario_id = $aud1.id }) } | ConvertTo-Json -Depth 5
  $out = Invoke-RestMethod -Uri "$base/os/$($ouvidoria1.id)/caixa" -Method Post -Headers $bh -Body $d -ContentType "application/json"
  Write-Output "    estado=$($out.caixa_estado) status=$($out.status) auditores=$($out.auditores.Count)"
}

# 4) Lidia (Ouvidoria) nao ve itens em distribuicao na caixa
Step "caixa Ouvidoria (Lidia ve so devolvidas)" {
  $cl = Get-Arr "/os/caixa-ouvidorias" $lh
  $achou = $cl | Where-Object { $_.id -eq $ouvidoria1.id }
  if ($achou) { throw "Ouvidoria nao deveria ver OUV em distribuicao" }
  Write-Output "    ok"
}

# 5) auditor1 retorna (OUV) -> desvincula e volta para qualidade
Step "retornar (auditor1)" {
  $out = Invoke-RestMethod -Uri "$base/os/$($ouvidoria1.id)/retornar" -Method Post -Headers $ah1 -Body "{}" -ContentType "application/json"
  $ativos = @($out.auditores | Where-Object ativo).Count
  Write-Output "    caixa=$($out.caixa_estado) ativos=$ativos"
}

# 6) Beatriz devolve a Ouvidoria (qualidade)
Step "devolver_ouvidoria (Beatriz)" {
  $d = @{ decisao = "devolver_ouvidoria"; auditores = @() } | ConvertTo-Json -Depth 3
  $out = Invoke-RestMethod -Uri "$base/os/$($ouvidoria1.id)/caixa" -Method Post -Headers $bh -Body $d -ContentType "application/json"
  Write-Output "    caixa=$($out.caixa_estado)"
}

# 7) Lidia ve devolvida na caixa da Ouvidoria
Step "caixa Ouvidoria recebe devolucao" {
  $cl = Get-Arr "/os/caixa-ouvidorias" $lh
  $achou = $cl | Where-Object { $_.id -eq $ouvidoria1.id }
  if (-not $achou) { throw "Ouvidoria deveria ver a devolucao" }
  Write-Output "    ok: $($achou.codigo) estado=$($achou.caixa_estado)"
}

# 8) Beatriz cria PFO e OS tipo PFO, vincula auditor1, auditor1 fecha pasta
$pfo = $null
Step "criar PFO (Beatriz)" {
  $body = @{
    fundamentacao_legal = "Art 100 CDDF - competencia UFOPE"; tema = "PFO smoke Vicente Pires";
    ra = "RA XXII - Vicente Pires"; raio_geo = 300
  } | ConvertTo-Json -Depth 5
  $pfo = Invoke-RestMethod -Uri "$base/programacoes" -Method Post -Headers $bh -Body $body -ContentType "application/json"
  $script:pfo = $pfo
  Write-Output "    $($pfo.codigo) id=$($pfo.id)"
}
$osPfo = $null
Step "criar OS tipo PFO sem auditor" {
  $body = @{
    origem = "programacao"; tema = ""; ra = ""; raio_geo = 0;
    frentes = @(@{ especialidade_id = $espId });
    auditores = @(); pfo_id = $pfo.id
  } | ConvertTo-Json -Depth 5
  $osPfo = Invoke-RestMethod -Uri "$base/os" -Method Post -Headers $bh -Body $body -ContentType "application/json"
  $script:osPfo = $osPfo
  Write-Output "    $($osPfo.codigo) id=$($osPfo.id) tema=$($osPfo.tema) raio=$($osPfo.raio_geo) pfo_id=$($osPfo.pfo_id)"
}
Step "atribuir auditor1 a PFO" {
  $d = ConvertTo-Json -InputObject @(@{ usuario_id = $aud1.id }) -Depth 5
  $out = Invoke-RestMethod -Uri "$base/os/$($osPfo.id)/atribuir" -Method Post -Headers $bh -Body $d -ContentType "application/json"
  Write-Output "    auditores=$($out.auditores.Count)"
}
Step "auditor1 ve PFO na pasta" {
  $minhas = Get-Arr "/os/minhas" $ah1
  $found = $minhas | Where-Object { $_.id -eq $osPfo.id }
  if (-not $found) { throw "PFO nao aparece na pasta do auditor" }
  Write-Output "    na pasta: $($found.codigo)"
}
Step "auditor2 nao deve ver a PFO" {
  $minhas = Get-Arr "/os/minhas" $ah2
  $found = $minhas | Where-Object { $_.id -eq $osPfo.id }
  if ($found) { throw "PFO nao deveria estar na pasta do auditor2" }
  Write-Output "    ok"
}
Step "fechar pasta PFO (auditor1)" {
  $out = Invoke-RestMethod -Uri "$base/os/$($osPfo.id)/fechar-pasta" -Method Post -Headers $ah1 -Body "{}" -ContentType "application/json"
  Write-Output "    fechado"
}
Step "pasta some do minhas apos fechar" {
  $minhas = Get-Arr "/os/minhas" $ah1
  $found = $minhas | Where-Object { $_.id -eq $osPfo.id }
  if ($found) { throw "PFO ainda aparece apos fechar pasta" }
  Write-Output "    some: ok"
}

Write-Output "SMOKE FASE B OK"
