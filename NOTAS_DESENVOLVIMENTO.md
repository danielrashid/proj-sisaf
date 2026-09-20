# SISAF 2.0 — Notas de Desenvolvimento

Documento de continuidade: define o objetivo, o estado atual e o próximo passo, para retomar o trabalho de onde parou.

## Objetivo

Elevar a qualidade do SISAF 2.0 (FastAPI/Postgres no backend + React/Vite/Tailwind no frontend, em `G:\proj-sisaf`) para um padrão **institucional de governo**: interface séria e legível (público mais velho), auditoria, observabilidade e segurança.

O trabalho acontece **"tela por tela"**, guiado por uma lista de **pontos de refatoração de layout** (navegação superior modular com grid responsivo). O usuário revisa cada ponto antes de avançar.

## Ambiente

- Backend: `http://127.0.0.1:8000` (uvicorn; PID em `backend\server.pid`)
- Frontend (dev): `http://localhost:5173` (vite; PID em `frontend\vite.pid`)
- Backend em Python 3.14.2 (`.venv`), build frontend: `npm run build` em `frontend`

### Reiniciar serviços (NÃO travar o terminal)

Os scripts usam `Start-Process` com stdout/err e **stdin → `stdin.nul`** — a única variante que sobrevive ao fim do comando.

- Backend: `powershell -NoProfile -ExecutionPolicy Bypass -File "G:\proj-sisaf\backend\restart_backend.ps1"`
- Frontend: `powershell -NoProfile -ExecutionPolicy Bypass -File "G:\proj-sisaf\frontend\restart_vite.ps1"`

Regras:
- **Nunca esperar/aguardar** o encerramento de scripts de restart em background — subir desacoplado (sub-shell assíncrono) com stdout/stderr redirecionados; o script imprimir `PID xxxx` = ação concluída; prosseguir de imediato.
- **Nunca combinar restart + verificação no mesmo comando** (o tool pode "esperar" a árvore do uvicorn; se isso ocorrer, abortar — a ação completa).
- Verificar/testar em chamada separada, **sem spawn** (Ex.: `Invoke-RestMethod` num único comando).
- Agrupar mudanças de backend para minimizar restarts.
- `run_backend.cmd`/`run_backend_inner.cmd` foram criados e **deletados** (processo morria). Não recriar via cmd.

### Usuários demo (senha `sisaf123`)

- `111.444.777-35` — admin (pesquisa ilimitada)
- `333.666.999-57` — chefe
- `666.999.222-80` — auditor (usado nos testes)
- `123.456.789-01` — atendimento

## Identidade visual (vigente)

- **Paleta oficial**: azul `#122E66` (tokens `brand`) + dourado `#FDB410` (tokens `gold` em `index.css` `@theme`; `gold-dark` `#a97b06`).
- **Política de cor**: azul `brand` = interface (botões primários, links, focos, hovers, badges de módulo/frente, stepper, toggle, barra de progresso). Dourado = urgência (KPI "Vencendo", chips de vencimento, botão Pesquisar, filete da guia ativa).
- **MANTIDO semântico (não mexer)**: `STATUS_COLORS` (status OS/auto), `ICON_TIPO`, alerta de atraso rose, `MapView` PALETA.
- **Exceção do Dashboard** (pedido explícito do usuário): Atrasada = vermelho, Em andamento = amarelo, Concluída = verde (padrão "semáforo") — vale SÓ no Painel.
- **Fonte**: Source Sans 3 variável (`@fontsource-variable/source-sans-3`). `html { font-size: 106.25% }` (~17px) por acessibilidade (público 45+); tudo em `rem` escala junto.
- Brasão: `frontend/public/assets/DFLegal_brasao.png`.
- Breakpoints: navbar com abas em `lg+`; hambúrguer em <lg. Prod: 1000+ acessos/dia, 100+ docs/dia — auditoria/segurança nível governo.

## Estado atual de cada ponto (refator de layout)

### Ponto 1 — Navegação Superior Modular ✔ (concluído)
- `Layout.tsx` reescrito: header `sticky top-0 z-50` em 2 linhas; linha 1 clara (`slate-100/95`, blur) com = brasão maior (h-12, container branco arredondado, hover azul), "SISAF" + badge de sufixo, busca global (desktop `Ctrl K`; mobile vira barra), sino de notificações, perfil, sair; linha 2 = faixa azul com gradiente `brand-900→800`, abas `text-[15px]`, aba ativa com filete dourado `3px`, "Nova OS" em dourado separado por divisor.
- **Header mede própria altura** (ref + `ResizeObserver` → CSS var `--header-h` no root; default `0` em `index.css`) — usada por painéis fixos que devem ficar abaixo da navbar.
- Componentes novos: `Notificacoes.tsx` (sino funcional: OS atrasadas/≤3d de `/os/minhas`) e `PerfilModal.tsx` (edita nome/email, troca senha com confirmação).
- Backend: `PATCH /auth/me` (`PerfilUpdateIn`), `GET /sistema/info` (`instancia_sufixo` em `config.py`), `host` no `request_logging`.
- Mobile: bottom nav mantida (Início, Painel, OS, Autos + Buscar) e hambúrguer.

### Ponto 2 — Pasta de Trabalho / Ações Fiscais na guia Início ✔ (concluído)
- Container superior em `MinhasOS.tsx`: ações (Nova OS / Tramitar / Retornar Documento), chips com contadores (Todos, Em andamento=azul, Vencendo=dourado, Atrasado=vermelho, Concluído=verde), filtros inline (Tipo de documento, Situação, Prazo de/até).
- Seleção de OS por radio → `TransicaoModal.tsx` lista transições válidas (espelho de `TRANSICOES` em `types.ts`) e chama `POST /os/{id}/transicao`.
- Removidos os 4 StatCards antigos (redundantes com os chips).

### Ponto 3 — Grid do Dashboard (Painel) ✔ (concluído — arquivo mais bugado até agora)
- Rota `/dashboard` + aba **Painel** no menu (entre Início e OS; também na bottom nav). Início continua sendo o `MinhasOS` pessoal.
- **Coluna esquerda (~66%, `lg:grid-cols-3`)**: tabela Foco Operacional (ID / Tipo / Estabelecimento / Status / Prazo; status por categoria atrasada=vermelho, em andamento=amarelo, concluída=verde; prazo textual "Atrasado 2d", "Vence hoje", "Vence em Xd") + 3 cards KPI (OS Ativas c/ barra % dentro do prazo; Próximos Vencimentos; Valores Estimados com `fmtMoeda`).
- **Coluna direita (~33%)**: mapa de geofiscalização + Ações Rápidas (2×2: Novo Auto, Nova Notificação, Registrar Vistoria → `/os`; Relatório Georref → `/geo`).
- Backend: `valor_estimado` adicionado a `/dashboard/resumo` (soma de `AutoInfracao.valor_total` com status lavrado/encaminhado).
- **Bug do mapa (RESOLVIDO — causa raiz)**: o Leaflet usa z-index interno até 1000; sem *stacking context* os tiles pintavam POR CIMA da navbar `z-50` ao rolar. Correção: `relative isolate` no container do mapa (z-index do Leaflet fica confinado ao card).
- **Expandir (como pedido)**: botão "Expandir" abre painel `fixed` que **cobre todo o conteúdo abaixo da navbar** (`top: var(--header-h)`, `z-40` < header `z-50`), ocultando Foco Operacional e os cards menores; "Recolher" devolve. Navbar segue visível e funcional.
- `MapView.tsx` blindado: `requestAnimationFrame(invalidateSize)` no mount + `ResizeObserver` no container.

### Ponto 4 — Regras de Responsividade ✔ (concluído)
- **Desktop (>1024px)**: `lg:grid-cols-3`; esquerda `lg:col-span-2` (tabela+KPIs, ~66%), direita `lg:col-span-1` (mapa+atalhos, ~33%).
- **Tablet (768-1023px)**: abaixo de `lg` o grid vira coluna única — o bloco mapa/atalhos (DOM vem depois) cai naturalmente **abaixo** da tabela/KPIs.
- **Mobile (<767px)**: cards empilham em 100%; tabela com scroll horizontal automático (`overflow-x-auto` + `min-w-[560px]` no `table`); mapa com altura fixa `h-64` (≈256px) que cresce em `md` (`h-80`) e `lg` (`h-72`) — não domina a tela.
- Comentário explicativo adicionado no JSX do grid do `Dashboard.tsx` de olho na manutenção.

### Rodada anterior (ainda vigente)
- Home UX: `StatCard` clicável, banner de atraso, ordenação por urgência, KPI clicáveis.
- Backend `prazo_dias` em `/os`; `OSList` com toggle `?vencendo=1`.
- Observabilidade/segurança: `/metrics` Prometheus, structlog (`http_request`/`audit`, `X-Request-ID`), migration `f8a3c1d2e9b7` (ip_address/user_agent no `log_auditoria` + índices), `GET /log` com filtros, `.env` com `SECRET_KEY`, `SecurityHeadersMiddleware`, `TrustedHostMiddleware`, rate limit login `10/minute`, `login_falhou` auditado.

## Modelo de Documentos (definido com o usuário — Fase A em revisão visual)

Regras acordadas: fluxo de tramitação **no documento E na OS**; modelagem **base + extensões**; tipos como **catálogo configurável** (não hardcoded).

### Ciclo de vida do documento
`rascunho → emitido → juntado`, com `aguardando_avaliacao` e `devolvido`:
- **rascunho**: só o autor edita livremente.
- **emitido**: edição livre **bloqueada**.
- **edição pós-emissão** (controlada): auditor envia edição + **justificativa** → `aguardando_avaliacao` → **diretor da unidade** valida: aceita (aplica a edição, volta a `emitido`) ou rejeita (vira `devolvido`; autor corrige e re-emite).
- **juntado**: anexado ao processo, somente leitura. Tudo audtado.

### Diretor (validação)
Sem campo `gestor id`. Diretor = **chefe atual da unidade** do auditor (batimento por unidade; quem ocupar a chefia daquela unidade valida naquele momento). Histórico fica na tabela de **trâmite** (quem, quando, o quê, justificativa, autorizado_por). João→Maria: o trâmite registra "autorizada por João" nas edições antigas; as novas são validadas pela Maria.

### Catálogo de tipos (seed inicial, configurável no Admin)
AUTOS: infração, infração por TEO (compartilham `AutoInfracao`/penalidade), interdição, embargo, notificação, intimação demolitória, apreensão — **interdição/embargo/demolitória = status próprio (mantida/liberada/cumprida), SEM multa**.
TERMOS: constatação de irregularidade, constatação de infração, retenção de volume, morador em situação de rua.
RELATÓRIOS (substituem `relatorio_tecnico`): ação fiscal, pré-operacional, operacional, interno — só base.
Extensões: `AutoInfracao` (infração + infração po r TEO); `ItensApreensao` (**apreensão + retenção de volume** compartilham: itens/custodiante/local de guarda); `TermoMoradorSitRua` (1:1 opcional).

### Numeração
- **Autos**: número **enviado do tablet** (auditor de campo) — sistema não gera.
- **Documentos feitos no computador** (termos/laudos/relatórios): `<PREFIXO>-<LETRA DO ANO>-<ID USUARIO 4d>-<SEQ 6d>-<SIGLA ESPECIALIDADE>`, ex.: `REL-A-0035-000406-AEU` (A=2026, B=2027…).
- **OS por origem** (substitui numero inteiro): ouvidoria `OUV-A-000002` (seq 6); programação fiscal `PFO-A-002-AEU` (seq 3 + sigla; **regras ainda a bater**); SEI `SEI-B-000029-FAU` (seq 6 + sigla); excepcional `EXP-A-000037-FAU` (seq 6 + sigla).

### Dispositivos
- Autos: criados via **API no tablet** (seleciona OS, lavra au, já vincula à OS).
- Relatórios: computador.
- UI no backend é única (API agnóstica); muda só a tela.

### Fases propostas
- **Fase A ✔ (backend + frontend implementados — aguardando revisão visual na UI)**: migration `c1d0e9a8b7f6` + modelos/enums novos; catálogo `tipos_documento` (19 seeds: 17 ativos + 2 legados inativos, flags `numero_do_tablet`/`usa_auto_infracao`/`usa_medida`/`usa_itens_apreensao`/`usa_morador_sit_rua`); `StatusDocumento` + `Tramite` (histórico com `usuario_nome`/`autorizado_por_nome`); numeração de computador (`PREFIXO-LETRA ANO-ID USUARIO-SEQ-SIGLA`, seq por prefixo+ano); autos numerados pelo tablet (`numero_auto` obrigatório no emitir p/ `numero_do_tablet=true`); extensões ItensApreensao/TermoMoradorSitRua/medida_status; fluxo de edição com justificativa (rascunho=livre; emitido/devolvido→`/edicao`→`aguardando_avaliacao`→diretor aprova/rejeita via `/avaliar`); endpoints: `POST /os/{id}/acoes`, `GET /tipos-documento`, `GET|PUT /acoes/{id}`, `POST /acoes/{id}/emitir|edicao|avaliar|juntar`, `GET /acoes/minhas`. **Rota `/acoes/minhas` registrada ANTES de `/acoes/{acao_id}`** (senão o path param captura "minhas" → 422). UI `OSDetail.tsx` parametrizada por tipo (modal de registro/edição com fieldsets base/AI/medida/itens/morador, emitir com número de tablet, avaliar, juntar, badges de status/documento, extensões e histórico de trâmite colapsável).
- **Fase B — OS por origem**: código de OS por origem (OUV/PFO/SEI/EXP).
- **Fase C — Admin do catálogo**: CRUD de tipos de documento.

## Próximo passo — Fase C (Catálogo de tipos) OU revisão visual da Fase B

**Fase B concluída e validada**: smoke_faseb (origin/caixa/distribuição/PFO) **e smoke_admin (12 passos)** passam — CRUD de usuários/unidades/permissões, ativo/inativo com bloqueio em runtime, atribuição de permissão a perfis, auditoria em todas as mutações. Backend e Frontend (Admin.tsx) prontos no `localhost:5173`.

Próximo: revisar manualmente no navegador as telas Admin (Usuários/Unidades/Permissões) e as telas da Fase B (Caixa Ouvidorias/Programações) e, após aprovação, seguir para a **Fase C** (Admin do catálogo de tipos de documento — CRUD completo de `tipos_documento` na UI, espelhando o CRUD de permissões já implementado em `/admin`).

Padrão de trabalho: implementar → `npm run build` (typecheck) → validar manualmente → perguntar se pode avançar.

Candidatos naturais (conversados): ajuste fino da tela Início/MinhasOS, integração de ações (Nova OS→OSDetail), melhorias nas listas OS/Autos, telas Admin/Log/Estabelecimentos.

## Fase B — Código de OS por origem ✔ (concluída)

### Origem, caixa e distribuição (validado por smoke)
- **Código OS por origem** (OUV/PFO/SEI/EXP): prefixo + letra do ano + seq por origem + sigla da especialidade ("Regras de OS" migrado para `codigos.py`). Backend responde `origem`, `sigla_origem`, `programacao_id` em `GET /os` (lazy-load módulo quando `q_id=programacao`).
- **PFO como documento-pai**: OS do tipo PFO com `modulo=programacao` cria PFO (documento OS + relaciona auditor e criador), reaproveitando numeração do documento pai; `aluno/estagiário` sem auditor é suportado.
- **Caixa Ouvidorias** (`/os/caixa-ouvidorias`): quem tiver permissão `caixa_ouvidorias` vê/gere a caixa das unidades com vínculo ativo; `distribuir` (auditor direciona a um colega), `retornar` (volta ao criador), `devolver_ouvidoria`, `retirar_ouvidoria`, `fechar_pasta` — relação `AuditoriaOS.auditor` para rastrear quem distribuiu.
- PFO sem auditor → criador vê em "minhas"; pasta **some de "minhas" ao fechar**, fica disponível na caixa.
- **Smoke Fase B passou end-to-end** (`smoke_faseb.ps1`: criar OUV→caixa→distribuir→retornar→devolver_ouvidoria→caixa de devoluções→PFO sem auditor→atribuir auditor→fechar pasta→some de minhas). `SMOKE FASE B OK`.

### Permissões e perfis → Admin (Fase B+ conversada)
- `perfil_permissoes`/`usuario_permissoes`: perfil×permissão, com `ativo` em `Permissao` (inativo remove o direito de quem só obtém via perfil) e `GET/PUT /admin/permissoes/{id}/perfis` (atribuir a perfis).
- Níveis: atendimento 1, auditor 3, subsecretário 6, admin 9; `perfil_id` obrigatório em `POST /admin/usuarios`.

### Admin — CRUD de usuários, unidades e permissões ✔ (validado por smoke `smoke_admin.ps1`)
- Rotas `app/api/admin.py` (nivel≥5 usuários/perfil, ≥6 estrutura): CRUD `usuarios` (com vínculos e `permissao_ids`), `unidades` (sigla + pai + módulos/especialidades), `perfis` (nível), `permissoes` (ativo), `permissoes/{id}/perfis` (atribuição via `perfil_ids`).
- `ativo` no usuário: usuário inativo **não faz login** (403) e pode ser reativado; auditoria (`log`) em todas as mutações.
- Frontend `Admin.tsx`: abas Usuários / Unidades / Permissões, toggles ativo/inativo (Switch), criação com `cpf` como **string** (sem `cpf` o backend 422; CPF number rejeitado em login — ver causa raiz abaixo).
- **Causa raiz do 401/422 em login admin (resolvido)**: CPF enviado como **número** — o schema `str` rejeita/comporta-se mal no pydantic. Corrigido o helper de smoke garantindo **cpf sempre string** (11 dígitos) em `Login()` e no corpo de criação; com cpf string o login/lockout/reativar funcionam.
- Resultado final: `SMOKE ADMIN OK (12 passos)` — inclui 403 p/ atendimento, criar→login→editar→inativar(403)→reativar, CRUD unidade/permissão e atribuição a perfis com log.

## Arquivos-chave

- `frontend\src\components\Layout.tsx` (navbar + `--header-h`), `Notificacoes.tsx`, `PerfilModal.tsx`, `TransicaoModal.tsx`, `MapView.tsx` (isolate + resize), `ui.tsx` (base: Badge/Card/Btn/StatCard/Modal/Field/inputCls/fmtMoeda…)
- `frontend\src\pages\`: `MinhasOS.tsx` (Início), `Dashboard.tsx` (Painel), `Login`, `OSList`, `OSDetail`, `OSCreate`, `Autos`, `Geo`, `Estabelecimentos`, `Admin`, `Logs`
- `frontend\src\lib\types.ts` (incl. `TRANSICOES`/`STATUS_TRANSICAO_LABEL`), `api.ts` (add `patch`), `auth.tsx` (`atualizarUsuario`)
- `frontend\src\index.css` (tokens `brand`/`gold`, fonte, `--header-h`, fonte-raiz acessível)
- `frontend\src\App.tsx` (rotas; `/dashboard` habilitada)
- `backend\app\api\`: `os.py` (`APIVOS`/`prazo_dias`/`/atribuir`/`/transicao`), `acoes.py` (Fase A: catálogo, emitir, edição c/ justificativa, avaliar, juntar, minhas), `dashboard.py` (`valor_estimado`), `auth.py` (PATCH me), `sistema.py`, `geo.py`, `log.py`
- `backend\app\schemas\schemas.py` (`ResumoDashboard`, `PerfilUpdateIn`, Fase A: `TipoDocumentoOut`/`TramiteOut`/extensões), `models\Models.py`
- Scripts de restart: `backend\restart_backend.ps1`, `frontend\restart_vite.ps1`
- Migration: `backend\alembic\versions\f8a3c1d2e9b7_log_auditoria_ip_user_agent.py`, `backend\alembic\versions\c1d0e9a8b7f6_fase_a_documentos.py` (Fase A: catálogo, tramites, extensões, colunas, backfill, índices)

## Decisões em aberto / pendências

- Status do Dashboard usa "semáforo" (amarelo=em andamento) enquanto a Home usa dourado=vencendo — unificar se o usuário pedir.
- `fmtMoeda` já inclui "R$" (não duplicar prefixo).
- Ações Rápidas que exigem OS ainda navegam para `/os` (sem fluxo dedicado).