# SISAF 2.0 — Requisitos e Regras de Negócio

Sistema Integrado de Ações Fiscais — versão 2.0.
Documento vivo: cada bloco abaixo reflete o que foi levantado até agora; pontos em aberto estão marcados na seção final.

---

## 1. Visão Geral

O SISAF 2.0 substitui o sistema atual, obsoleto, mantendo o fluxo central do negócio (abrir OS → vincular auditor → fiscalizar → devolver → decidir → arquivar), porém:

- tratando **cada especialidade como um módulo isolado** (mudanças em um não afetam os outros);
- eliminando os "gatos" manuais no banco de dados (regras de negócio não modeladas);
- integrando-se ao ecossistema do órgão e ao sistema tributário.

## 2. Glossário

| Sigla | Significado |
|---|---|
| SISAF | Sistema Integrado de Ações Fiscais |
| OS | Ordem de Serviço |
| OS | Frente de fiscalização vinculada a uma OS |
| AEU | Atividade Econômica Urbana |
| OEU | Obras e Edificações Urbanas |
| FAU | Fiscal de Atividades Urbanas (resíduos) |
| AI | Auto de Infração |
| SEI | Sistema Eletrônico de Informações (processo) |
| RA | Região Administrativa (DF) |
| SUOB | Unidade orgânica (ex.: Subsecretaria de Obras) |
| SUOP | Unidade orgânica (a confirmar) |
| UFOPE | Unidade orgânica (a confirmar) |
| DIFIS1 | Diretoria de Fiscalização área 1 (exemplo de unidade da SUOB) |

## 3. Módulos por Especialidade

Cada especialidade é um **módulo independente**, com formulários, etapas, prazos e fluxos próprios.

| Especialidade | Especificidades conhecidas |
|---|---|
| AEU — Atividade Econômica Urbana | Fluxo padrão de fiscalização de estabelecimentos |
| OEU — Obras e Edificações Urbanas | Fluxo de **habite-se**; fiscalização de obras |
| FAU — Resíduos | **Termo de morador de rua**, **retenção de volume** |

**Requisito modular (arquitetura):** módulos precisam permitir evolução e correção em separado, sem regressão entre especialidades.

## 4. Regras de Negócio

### RN-01 — Unidade multiespecialidade (resolver "gato" 1)
Uma unidade pode operar **mais de uma especialidade** (ex.: UFOPE e SUOP operam as 3). O vínculo correto é **Unidade ↔ Especialidade**, não unidade → uma única especialidade.
O chefe/diretor de uma unidade pode montar uma OS com auditores de **qualquer especialidade operada pela sua unidade**.

### RN-17 — Organograma configurável (resolver "gato" 1)
- O sistema deve ter **tela administrativa para cadastrar unidades vinculadas aos usuários** — composta por **especialidade + unidade + coordenação/diretoria/gerência**.
- Inclusão/edição do organograma é feita pelo sistema, **sem necessidade de acesso manual ao banco**.

### RN-02 — OS multiespecialidade
Uma OS pode conter solicitações de **mais de uma especialidade no mesmo local** (ex.: obra irregular + acúmulo de resíduos + atividade econômica irregular). Cada frente da OS é encaminhada ao auditor da especialidade correspondente.

### RN-03 — Arquivamento como estado (resolver "gato" 2)
"Arquivado" é um **estado do ciclo de vida** da OS e do Auto de Infração — **não** um usuário/atribuição.
Deve ser possível **desarquivar** e retomar o fluxo a partir do estado adequado.

### RN-04 — Origens da OS
Uma OS é aberta a partir de um "ponto" (origem):
- Ouvidoria;
- Excepcional;
- Processo SEI;
- Programação fiscal (tema).

### RN-05 — Devolução facultativa
- OS de **ouvidoria** e **excepcional** exigem devolução do auditor após o atendimento.
- OS de **programação fiscal** pode ser criada para ações genéricas do ano todo e **não exige devolução**.

### RN-06 — Decisão pós-devolução
Após a devolução, quem decide (diretor/gerente) pode:
1. **Concluir** a OS;
2. **Retornar ao mesmo auditor** para nova conferência (caso típico de ouvidoria);
3. **Retornar a outro auditor** para nova auditoria.

### RN-07 — Arquivar/desarquivar
A OS pode ser arquivada; se necessário, pode ser **desarquivada** e o fluxo reiniciado.

### RN-08 — Prazos e alertas
- Prazos obrigatórios para OS de **ouvidoria** e **excepcional**, definidos na criação.
- **Alertas de vencimento** para o auditor (ex.: OS próxima de vencer).
- OS de **programação fiscal** pode ter prazo longo (ex.: o ano completo) e **não gera problema ao vencer**.

### RN-09 — Atribuição por unidade
- Hierarquia: **subsecretário / chefe de unidade / coordenador / diretor / gerente / auditor de campo**.
- **Acima do auditor de campo** é possível **criar OS** e **atribuir** para um **grupo** ou para um **auditor específico**.
- O diretor/gerente **só atribui para auditores da própria unidade** (ex.: DIFIS1 → 5 auditores da DIFIS1).

### RN-10 — Reincidência
Reincidência de multa = **mesmo CNPJ × mesma natureza** da infração. A reincidência deve ser computada automaticamente no histórico do estabelecimento.

### RN-11 — Histórico do estabelecimento
O auditor deve consultar o **histórico de ações do estabelecimento por CNPJ ou geolocalização**. Se um estabelecimento já recebeu notificação anterior (auditor A) e é reincidente (auditor B, meses depois), o sistema deve permitir aplicar penalidade mais severa (ex.: Auto de Infração), com base nesse histórico.

### RN-12 — Auto de Infração e sistema tributário
- O AI tem **fluxo de recurso**: o auditor define o prazo de pagamento/impugnação conforme a legislação.
- O AI **comunica-se com o sistema tributário**: lá é tratado como multa. O SISAF **recebe do sistema tributário apenas o status** (pago, não pago, cancelado, etc.).

### RN-13 — Georreferenciamento
- Localização das ações em mapa;
- Planejamento estratégico por **RAs**;
- **Atribuição geográfica** de OS;
- Camadas: **lotes registrados e ocupados**;
- **Cruzamento com ações na região** — **raio configurável por OS** (ex.: raio de 50 m).

### RN-14 — Trilha de auditoria
Registro (log) de **cada passo de cada auditor** nas ações, imutável e auditável (rastreabilidade fiscal).

### RN-15 — Sigilo e LGPD
- Existem regras de sigilo/isolamento de dados entre unidades e especialidades, hoje **fracas**.
- Adequação à **LGPD** seguindo boas práticas de mercado (base legal, controle de acesso, dados sensíveis), com **trilha de log** como mecanismo central de conformidade.

### RN-16 — Assinatura
Manter o **validador próprio** (hash), com assinatura realizada no tablet.
O documento assinado deve gerar um **QR Code** e uma **página pública de verificação**, permitindo ao cidadão conferir a autenticidade do documento sem acessar o sistema.

## 5. Ações Fiscais (tipos)

O auditor pode registrar, durante e após a fiscalização:

- Auto de Infração (AI);
- Notificação;
- Relatório Técnico;
- Interdição;
- Apreensão;
- (outros tipos a confirmar por especialidade).

### Fluxo do Auto de Infração
1. Auditor lava o AI na OS.
2. Define prazo para pagamento ou impugnação (conforme legislação).
3. AI é enviado ao sistema tributário (multa).
4. SISAF acompanha status retornado (pago/não pago/cancelado).
5. Reincidência: mesmo CNPJ × mesma natureza.

## 6. Fluxo da OS (proposto — validar)

```
CRIADA (ponto: ouvidoria/excepcional/SEI/programação)
  → VINCULADA a auditor(es) (grupo ou específico; por unidade)
  → EM EXECUÇÃO (auditor registra ações ficais)
  → DEVOLVIDA (opcional p/ programação fiscal)
     ├─ CONCLUÍDA
     ├─ REABERTA (mesmo auditor — nova conferência) [típico ouvidoria]
     ├─ REDIRECIONADA (outro auditor — nova auditoria)
     └─ (programação fiscal: segue em execução durante o ano)
  → ARQUIVADA
  → DESARQUIVADA (retoma fluxo)
```

Estados formais do sistema a serem definidos (rascunho): `rascunho`, `criada`, `vinculada`, `em_execucao`, `devolvida`, `concluida`, `arquivada`, `desarquivada`, `cancelada`.

## 7. Contexto Arquitetural

- **SISAF 2.0 é um módulo do ecossistema** `sistemas.dflegal.df.gov.br`: faz autenticação única (SSO) e, se o perfil do usuário permite, o SISAF aparece no portal. Outros sistemas serão integrados ao mesmo portal.
- **App móvel** já existe, trabalha **offline** e sincroniza via **API (Flask)** (reuso a confirmar com o time técnico).
- **Integração externa**: sistema tributário (status do AI).
- **Stack definida**: banco **PostgreSQL**; backend e frontend com as **melhores práticas de mercado** (stack específica a detalhar com o time técnico).
- **Escala**: ~**700 usuários**; o sistema atual opera com **3 instâncias atrás de balanceador de carga**. O 2.0 deve ser **stateless**, suportando escala equivalente ou superior atrás do mesmo modelo.

## 8. Modelo de Dados (rascunho)

Entidades centrais propostas:

- `Usuario` (com perfis de acesso)
- `Perfil`/`Permissao`
- `Unidade` (ex.: SUOB, SUOP, UFOPE, DIFIS1)
- `Especialidade` (AEU, OEU, FAU)
- `Unidade_Especialidade` (vínculo N:N — resolve RN-01/RN-17)
- `VinculoFuncional` (usuário × especialidade × unidade × coordenação/diretoria/gerência — RN-17, cadastro administrativo)
- `OrdemServico` (origem, tema/RA, endereço, coordenadas, prazo, estado)
- `OS_Frente` (solicitações por especialidade dentro da OS — RN-02)
- `OS_Auditor` (vínculo OS × frente × auditor)
- `AcaoFiscal` (AI, notificação, relatório técnico, interdição, apreensão)
- `AutoInfracao` (natureza, valores, prazos, recurso, status local)
- `StatusAI_Tributario` (espelho do retorno do sistema tributário)
- `Historico_Estabelecimento` (por CNPJ e/ou geolocalização — consulta RN-11)
- `Reincidencia` (CNPJ × natureza — RN-10)
- `LogAuditoria` (trilha imutável — RN-14)
- `CamadasGeo` (lotes registrados/ocupados, RAs)

## 9. Pontos em Aberto (a confirmar com o negócio/TI)

1. **Organograma oficial** — **definido**: cadastro administrativo no sistema (especialidade + unidade + coordenação/diretoria/gerência vinculadas ao usuário) — ver RN-17.
2. **Estados formais** — **validado** (fluxo da seção 6). Requisito: gerenciamento de estados por status (não por usuário/função).
3. **Natureza da infração** — **pendente**: usuário fornecerá a tabela de naturezas por especialidade posteriormente.
4. **Volumes** — **informado**: ~700 usuários; operação atual com 3 instâncias atrás de balanceador.
5. **LGPD** — **definido**: boas práticas de mercado com trilha de log (RN-15).
6. **Assinatura** — **definido**: validador próprio + QR Code + página pública de verificação (RN-16).
7. **Migração** — **posterior** (fora de escopo por ora).
8. **Stack** — **definido**: PostgreSQL; backend/frontend conforme melhores práticas de mercado (stack específica a detalhar com o time técnico).
9. **Raio de cruzamento geo** — **definido**: configurável por OS.
10. **Fluxos especiais por especialidade** — **posterior**: detalhar "habite-se" (OEU), "termo de morador de rua" e "retenção de volume" (FAU).

---
*Dica: para não depender desses PIDs, rode cada um num terminal separado (python -m uvicorn app.main:app --port 8000 no backend e npm run dev no frontend). Quer que eu verifique algum erro específico que você está vendo na tela?*
*Última atualização: resposta dos pontos 1–6 (organograma configurável, fluxo validado, volumes, LGPD, assinatura QR, stack, raio geo).*