# SISAF 2.0 — Sistema Integrado de Ações Fiscais

Protótipo funcional com base em `requisitos-sisaf2.md`. Backend FastAPI + PostgreSQL + frontend React/Vite/Tailwind.

## Pré-requisitos

- Python 3.12+ (testado com 3.14)
- Node 20+
- PostgreSQL local (testado com 18) **ou** Docker

## Banco de dados (uma vez)

Opção A — **Postgres local (recomendado neste projeto)**:

```powershell
psql -h localhost -U postgres -d postgres -c "CREATE ROLE sisaf LOGIN PASSWORD 'sisaf'"
psql -h localhost -U postgres -d postgres -c "CREATE DATABASE sisaf OWNER sisaf"
```

Opção B — **Docker**:

```powershell
docker compose up -d db
```

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt

# migrations + dados de demonstração
.\.venv\Scripts\alembic upgrade head
.\.venv\Scripts\python seed.py

# rodar API (http://localhost:8000/docs)
.\.venv\Scripts\python -m uvicorn app.main:app --port 8000
```

> Recriar os dados de demonstração: `DROP SCHEMA public CASCADE; CREATE SCHEMA public AUTHORIZATION sisaf;` no banco, e rode os comandos acima novamente.

## Frontend

```powershell
cd frontend
npm install
npm run dev   # http://localhost:5173
```

## Usuários de demonstração (senha: `sisaf123`, login por CPF)

| Papel | CPF | Pesquisa ilimitada |
|---|---|---|
| Administrador | `111.444.777-35` | Sim |
| Subsecretário | `222.555.888-46` | Sim |
| Chefe de unidade (UFOPE — 3 módulos) | `333.666.999-57` | Sim |
| Diretor (DIFIS1 — só AEU) | `444.777.000-68` | Sim |
| Gerente (SUOP) | `555.888.111-79` | Sim |
| Auditor AEU | `666.999.222-80` | Não |
| Auditor AEU (DIFIS1) | `777.000.333-91` | Não |
| Auditor OEU | `888.111.444-02` | Não |
| Auditor FAU | `999.222.555-13` | Não |
| Atendimento (LGPD) | `123.456.789-01` | Não |

A permissão de **pesquisa ilimitada** é individual e concedida por chefe de unidade+
na tela Admin (independente do perfil). Sem ela, a pesquisa geral é **limitada**
(LGPD): CPF/CNPJ e endereços mascarados. Toda busca é registrada no log de auditoria.

A tela inicial após o login é o **foco do auditor** (minhas OS + ações fiscais).
Após a primeira migração, rode `python patch_dados_demo.py` uma vez para adicionar
CPFs e perfil de atendimento ao banco já populado.

## Regras de negócio implementadas no protótipo

- **RN-01/RN-17**: unidade × especialidade configurável (UFOPE/SUOP operam os 3 módulos); vínculo usuário × unidade × especialidade × cargo.
- **RN-02**: OS multiespecialidade — uma OS com frentes AEU+OEU+FAU, cada auditor na sua frente.
- **RN-03/07**: arquivado é um **status do fluxo**, não um usuário (desarquivar retoma o ciclo).
- **RN-05/08**: devolução facultativa (programação fiscal não devolve) e prazos com alerta de vencimento.
- **RN-09**: criação de OS só para perfis acima de auditor de campo; atribuição restrita à unidade do criador.
- **RN-10/11**: reincidência automática (CNPJ × natureza) e histórico do estabelecimento por CNPJ.
- **RN-12**: AI com prazos de pagamento/impugnação e status tributário (espelho do sistema tributário).

## Estrutura

```
backend/   FastAPI + SQLAlchemy + Alembic (migrations em alembic/versions)
frontend/  React + Vite + Tailwind (telas: login, painel, OS, autos, geo, estabelecimentos, admin, log)
docker-compose.yml  Postgres 16
requisitos-sisaf2.md  Documento de requisitos/regras de negócio
```