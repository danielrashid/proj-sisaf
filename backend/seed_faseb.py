"""Dados de demonstração da Fase B sobre um banco já populado (idempotente).

- Unidade Ouvidoria (OUV), hierarquia (DIFIS1 -> SUOB);
- permissão caixa_ouvidorias (perfil admin + usuários diretos);
- usuária Lídia (unidade Ouvidoria) com a permissão concedida diretamente;
- PFO de exemplo (unidade SUOB) + vínculo da OS tipo PFO existente;
- Ouvidoria de exemplo aguardando na caixa da UFOPE.

Uso: python seed_faseb.py
"""

from datetime import date, timedelta

from app.core.codigos import gerar_codigo_os
from app.core.security import hash_senha
from app.database import SessionLocal
from app.models.models import (
    CaixaEstado,
    Especialidade,
    OrdemServico,
    OSFrente,
    OrigemOS,
    OsUnidadeEvento,
    Perfil,
    Permissao,
    ProgramacaoFiscal,
    StatusOS,
    Unidade,
    UnidadeEspecialidade,
    Usuario,
    UsuarioPermissao,
    VinculoFuncional,
)

SENHA = "sisaf123"


def obter_ou_criar_unidade(db, sigla, nome, especiais=None, pai=None):
    u = db.query(Unidade).filter(Unidade.sigla == sigla).first()
    if u:
        return u
    u = Unidade(nome=nome, sigla=sigla, unidade_pai_id=pai.id if pai else None)
    db.add(u)
    db.flush()
    for s in especiais or []:
        esp = db.query(Especialidade).filter(Especialidade.sigla == s).first()
        if esp and not db.query(UnidadeEspecialidade).filter_by(
            unidade_id=u.id, especialidade_id=esp.id
        ).first():
            db.add(UnidadeEspecialidade(unidade=u, especialidade=esp))
    return u


def main() -> None:
    db = SessionLocal()
    try:
        # --- Hierarquia: DIFIS1 dentro da SUOB ---
        difis1 = db.query(Unidade).filter(Unidade.sigla == "DIFIS1").first()
        suob = db.query(Unidade).filter(Unidade.sigla == "SUOB").first()
        if difis1 and suob and difis1.unidade_pai_id is None:
            difis1.unidade_pai_id = suob.id

        # --- Unidade Ouvidoria ---
        ouv = obter_ou_criar_unidade(
            db, "OUV", "Ouvidoria", especiais=["AEU"]
        )

        # --- Permissão caixa_ouvidorias ---
        perm = db.query(Permissao).filter_by(codigo="caixa_ouvidorias").first()
        if not perm:
            perm = Permissao(codigo="caixa_ouvidorias", nome="Caixa de Ouvidorias")
            db.add(perm)
            db.flush()
        admin_perfil = db.query(Perfil).filter_by(codigo="admin").first()
        if admin_perfil and perm not in admin_perfil.permissoes:
            admin_perfil.permissoes.append(perm)

        # --- Lídia: atendente da Ouvidoria com a permissão direta ---
        lidia = db.query(Usuario).filter_by(email="lid@sisaf.local").first()
        if not lidia:
            atend = db.query(Perfil).filter_by(codigo="atendimento").first()
            lidia = Usuario(
                nome="Lídia Ouvidoria",
                email="lid@sisaf.local",
                cpf="12131415160",
                senha_hash=hash_senha(SENHA),
                perfil=atend,
            )
            db.add(lidia)
            db.flush()
            aeu = db.query(Especialidade).filter_by(sigla="AEU").first()
            db.add(VinculoFuncional(
                usuario=lidia, unidade=ouv, especialidade=aeu,
                cargo="Atendimento (Ouvidoria)",
            ))
            db.add(UsuarioPermissao(usuario_id=lidia.id, permissao_id=perm.id))

        # --- Chefe UFOPE também vê a caixa (via permissão direta) ---
        beatriz = db.query(Usuario).filter_by(cpf="33366699957").first()
        if beatriz and not db.query(UsuarioPermissao).filter_by(
            usuario_id=beatriz.id, permissao_id=perm.id
        ).first():
            db.add(UsuarioPermissao(usuario_id=beatriz.id, permissao_id=perm.id))

        # --- PFO pai (documento nasce emitido) ---
        pfo = db.query(ProgramacaoFiscal).first()
        if not pfo:
            sub = db.query(Usuario).filter_by(cpf="22255588846").first()
            pfo = ProgramacaoFiscal(
                codigo=gerar_codigo_os(db, OrigemOS.programacao, "SUOB", date.today().year),
                fundamentacao_legal=(
                    "Art. X do Código de Fiscalização do DF; DL Y/2026 "
                    "(competência SUOB). Fiscalização preventiva por região "
                    "administrativa durante o exercício."
                ),
                tema="Programação anual de obras e posturas — Vicente Pires",
                ra="RA XXII - Vicente Pires",
                raio_geo=300.0,
                unidade_id=suob.id if suob else ouv.id,
                criado_por_id=sub.id if sub else lidia.id,
            )
            db.add(pfo)
            db.flush()

        # --- Vincula a OS tipo PFO existente à PFO pai ---
        os2 = db.query(OrdemServico).filter(OrdemServico.origem == OrigemOS.programacao).first()
        if os2 and os2.pfo_id is None:
            os2.pfo_id = pfo.id
            os2.fundamentacao_legal = pfo.fundamentacao_legal

        # --- Exemplo de OUV aguardando na caixa da UFOPE ---
        existente = db.query(OrdemServico).filter(
            OrdemServico.origem == OrigemOS.ouvidoria,
            OrdemServico.caixa_estado == CaixaEstado.na_caixa.value,
        ).first()
        if not existente:
            ufope = db.query(Unidade).filter(Unidade.sigla == "UFOPE").first()
            aeu = db.query(Especialidade).filter_by(sigla="AEU").first()
            ultimo = db.query(OrdemServico).order_by(OrdemServico.numero.desc()).first()
            nova = OrdemServico(
                numero=(ultimo.numero + 1) if ultimo else 1,
                codigo=gerar_codigo_os(db, OrigemOS.ouvidoria, None, date.today().year),
                origem=OrigemOS.ouvidoria,
                tema="Denúncia: terrenos baldios com acúmulo de lixo",
                ra="Ceilândia",
                raio_geo=50.0,
                prazo_data=date.today() + timedelta(days=10),
                descricao="Manifestação via Participa. Encaminhada pela Ouvidoria para análise.",
                status=StatusOS.criada,
                criado_por_id=lidia.id,
                caixa_estado=CaixaEstado.na_caixa.value,
                unidade_responsavel_id=ufope.id if ufope else ouv.id,
            )
            db.add(nova)
            db.flush()
            db.add(OSFrente(os_id=nova.id, especialidade=aeu, descricao="Verificação de limpeza"))
            db.add(OsUnidadeEvento(
                os_id=nova.id,
                unidade_id=ufope.id if ufope else ouv.id,
                papel="responsavel",
                criado_por_id=lidia.id,
            ))

        db.commit()
        print("Seed Fase B concluído.")
    finally:
        db.close()


if __name__ == "__main__":
    main()