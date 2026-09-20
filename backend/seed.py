"""Popula o banco com dados de demonstração do SISAF 2.0.

Uso: python seed.py
Requer: banco criado e migrations aplicadas (alembic upgrade head).
"""

from datetime import date, timedelta

from app.core.security import hash_senha
from app.database import SessionLocal
from app.models.models import (
    AcaoFiscal,
    AutoInfracao,
    CamadaGeo,
    Especialidade,
    Estabelecimento,
    ItensApreensao,
    OrdemServico,
    OSAuditor,
    OSFrente,
    OrigemOS,
    Perfil,
    Reincidencia,
    StatusAI,
    StatusDocumento,
    StatusOS,
    StatusTributario,
    TermoMoradorSitRua,
    TipoAcao,
    TipoDocumento,
    Unidade,
    UnidadeEspecialidade,
    Usuario,
    VinculoFuncional,
)

SENHA = "sisaf123"
HOJE = date.today()


def poly(lat_s, lat_n, lng_w, lng_e):
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"nome": "regiao"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [lng_w, lat_s], [lng_e, lat_s],
                            [lng_e, lat_n], [lng_w, lat_n], [lng_w, lat_s],
                        ]
                    ],
                },
            }
        ],
    }


def main() -> None:
    db = SessionLocal()
    try:
        if db.query(Especialidade).count():
            print("Banco já populado. Abortando para evitar duplicação.")
            return

        perfis = {}
        for codigo, nome, nivel in [
            ("admin", "Administrador(a)", 9),
            ("subsecretario", "Subsecretário(a)", 6),
            ("chefe_unidade", "Chefe de Unidade", 5),
            ("coordenador", "Coordenador(a)", 4),
            ("diretor", "Diretor(a)", 3),
            ("gerente", "Gerente", 2),
            ("auditor_campo", "Auditor(a) de Campo", 1),
            ("atendimento", "Atendimento (LGPD)", 1),
        ]:
            p = Perfil(codigo=codigo, nome=nome, nivel=nivel)
            db.add(p)
            perfis[codigo] = p

        esp = {}
        for sigla, nome, desc in [
            ("AEU", "Atividade Econômica Urbana", "Fiscalização de estabelecimentos e atividades econômicas"),
            ("OEU", "Obras e Edificações Urbanas", "Inclui fluxo de habite-se e fiscalização de obras"),
            ("FAU", "Fiscal de Atividades Urbanas", "Resíduos, termo de morador de rua e retenção de volume"),
        ]:
            e = Especialidade(sigla=sigla, nome=nome, descricao=desc)
            db.add(e)
            esp[sigla] = e

        unidades = {}
        for sigla, nome, especiais in [
            ("SUOB", "Subsecretaria de Obras", ["AEU", "OEU"]),
            ("SUOP", "Subsecretaria de Operações Urbanas", ["AEU", "OEU", "FAU"]),
            ("UFOPE", "Unidade de Fiscalização de Posturas e Edificações", ["AEU", "OEU", "FAU"]),
            ("DIFIS1", "Diretoria de Fiscalização Área 1", ["AEU"]),
        ]:
            u = Unidade(sigla=sigla, nome=nome)
            db.add(u)
            unidades[sigla] = u
            for s in especiais:
                db.add(UnidadeEspecialidade(unidade=u, especialidade=esp[s]))

        def usuario(
            nome, email, perfil, vinculos, cpf=None, pesquisa_ilimitada=False
        ):
            u = Usuario(
                nome=nome,
                email=email,
                cpf=cpf,
                senha_hash=hash_senha(SENHA),
                perfil=perfis[perfil],
                pesquisa_ilimitada=pesquisa_ilimitada,
            )
            db.add(u)
            db.flush()
            for unidade, especialidades, cargo in vinculos:
                for s in especialidades:
                    db.add(VinculoFuncional(
                        usuario=u, unidade=unidades[unidade],
                        especialidade=esp[s], cargo=cargo,
                    ))
            return u

        admin = usuario(
            "Ana Administradora", "admin@sisaf.local", "admin", [],
            cpf="11144477735", pesquisa_ilimitada=True,
        )
        sub = usuario(
            "Carlos Subsecretário", "sub@sisaf.local", "subsecretario",
            [("SUOB", ["AEU"], "Subsecretário Adjunto")],
            cpf="22255588846", pesquisa_ilimitada=True,
        )
        chefe = usuario(
            "Beatriz Chefe UFOPE", "chefe@sisaf.local", "chefe_unidade",
            [("UFOPE", ["AEU", "OEU", "FAU"], "Chefe de Unidade")],
            cpf="33366699957", pesquisa_ilimitada=True,
        )
        diretor = usuario(
            "Diego Diretor DIFIS1", "diretor@sisaf.local", "diretor",
            [("DIFIS1", ["AEU"], "Diretor da DIFIS1")],
            cpf="44477700068", pesquisa_ilimitada=True,
        )
        gerente = usuario(
            "Elisa Gerente SUOP", "gerente@sisaf.local", "gerente",
            [("SUOP", ["AEU", "OEU", "FAU"], "Gerente")],
            cpf="55588811179", pesquisa_ilimitada=True,
        )
        aeu1 = usuario(
            "Fabio Auditor AEU", "aeu1@sisaf.local", "auditor_campo",
            [("UFOPE", ["AEU"], "Auditor(a) de Campo")],
            cpf="66699922280",
        )
        aeu2 = usuario(
            "Gabriela Auditor AEU", "aeu2@sisaf.local", "auditor_campo",
            [("DIFIS1", ["AEU"], "Auditor(a) de Campo")],
            cpf="77700033391",
        )
        oeu1 = usuario(
            "Heloísa Auditor OEU", "oeu1@sisaf.local", "auditor_campo",
            [("UFOPE", ["OEU"], "Auditor(a) de Campo"), ("SUOB", ["OEU"], "Auditor(a) de Campo")],
            cpf="88811144402",
        )
        fau1 = usuario(
            "Igor Auditor FAU", "fau1@sisaf.local", "auditor_campo",
            [("UFOPE", ["FAU"], "Auditor(a) de Campo"), ("SUOP", ["FAU"], "Auditor(a) de Campo")],
            cpf="99922255513",
        )
        atend1 = usuario(
            "Juliana Atendente", "atend1@sisaf.local", "atendimento",
            [("SUOP", ["AEU"], "Atendimento")],
            cpf="12345678901",
        )

        estab = {
            "12345678000190": Estabelecimento(
                cnpj="12345678000190", razao_social="Padaria Estrela do Cerrado",
                endereco="SQS 308 Bloco A - Brasília", latitude=-15.7902, longitude=-47.8915,
            ),
            "98765432000110": Estabelecimento(
                cnpj="98765432000110", razao_social="Auto Peças Planalto",
                endereco="SIG Quadra 2 - Brasília", latitude=-15.7950, longitude=-47.8840,
            ),
            "11122233000144": Estabelecimento(
                cnpj="11122233000144", razao_social="Construtora Capital Norte",
                endereco="Av. das Castanheiras - Águas Claras", latitude=-15.8450, longitude=-48.0300,
            ),
        }
        for e in estab.values():
            db.add(e)

        def criar_os(numero, origem, tema, ra, cnpj, lat, lng, raio, prazo, status, criado_por, frentes, auditores):
            os_ = OrdemServico(
                numero=numero, origem=origem, tema=tema, ra=ra, cnpj=cnpj,
                latitude=lat, longitude=lng, raio_geo=raio, prazo_data=prazo,
                status=status, criado_por_id=criado_por.id,
                descricao=f"OS demo {numero} — {tema}",
            )
            db.add(os_)
            db.flush()
            frentes_map = {}
            for sigla, desc in frentes:
                f = OSFrente(os_id=os_.id, especialidade=esp[sigla], descricao=desc)
                db.add(f)
                frentes_map[sigla] = f
            db.flush()
            for auditor, sigla in auditores:
                db.add(OSAuditor(
                    os_id=os_.id, usuario=auditor,
                    frente_id=frentes_map.get(sigla).id if sigla else None,
                    atribuido_por_id=criado_por.id,
                ))
            return os_

        def criar_acao(os_, auditor, tipo, titulo, auto=None, descricao=None,
                       itens=None, morador=None):
            td = (
                db.query(TipoDocumento)
                .filter(TipoDocumento.chave == tipo.value)
                .first()
            )
            acao = AcaoFiscal(
                os_id=os_.id, auditor_id=auditor.id, tipo=tipo,
                titulo=titulo, descricao=descricao,
                tipo_documento_id=td.id if td else None,
                status_documento=StatusDocumento.emitido,
            )
            db.add(acao)
            db.flush()
            if itens:
                for item in itens:
                    db.add(ItensApreensao(acao_id=acao.id, **item))
            if morador:
                db.add(TermoMoradorSitRua(acao_id=acao.id, **morador))
            if auto:
                ai = AutoInfracao(acao_id=acao.id, **auto)
                db.add(ai)
                db.flush()
                cnpj = auto.get("cnpj")
                natureza = auto.get("natureza")
                if cnpj and natureza:
                    anteriores = (
                        db.query(AutoInfracao)
                        .filter(
                            AutoInfracao.cnpj == cnpj,
                            AutoInfracao.natureza == natureza,
                            AutoInfracao.id != ai.id,
                        )
                        .count()
                    )
                    if anteriores:
                        ai.reincidente = True
                        db.add(Reincidencia(
                            ai_id=ai.id, cnpj=cnpj, natureza=natureza,
                            numero_ocorrencia=anteriores + 1,
                        ))
            return acao

        os1 = criar_os(
            1, OrigemOS.ouvidoria, "Denúncia: atividade econômica sem alvará",
            "Asa Sul", "12345678000190", -15.7902, -47.8915, 50,
            HOJE + timedelta(days=7), StatusOS.em_execucao, chefe,
            [("AEU", "Verificação de alvará de funcionamento")],
            [(aeu1, "AEU")],
        )
        criar_acao(os1, aeu1, TipoAcao.notificacao, "Notificação de regularização",
                   descricao="Prazo de 30 dias para apresentação de alvará.")
        criar_acao(os1, aeu1, TipoAcao.auto_infracao, "Auto de Infração - sem alvará",
                   auto=dict(
                       cnpj="12345678000190", razao_social="Padaria Estrela do Cerrado",
                       natureza="Exercício de atividade sem alvará de funcionamento",
                       item_legislacao="Lei Distrital XXXX",
                       valor_total=1200.00,
                       prazo_pagamento=HOJE + timedelta(days=15),
                       prazo_recurso=HOJE + timedelta(days=20),
                   ))

        os2 = criar_os(
            2, OrigemOS.programacao, "Programação anual de fiscalização de obras",
            "Águas Claras", "11122233000144", -15.8450, -48.0300, 200,
            HOJE + timedelta(days=365), StatusOS.vinculada, gerente,
            [("OEU", "Vistoria de obra - habite-se")],
            [(oeu1, "OEU")],
        )

        os3 = criar_os(
            3, OrigemOS.excepcional, "Obra irregular com acúmulo de resíduos e comércio",
            "Ceilândia", None, -15.8170, -48.1130, 100,
            HOJE + timedelta(days=10), StatusOS.em_execucao, chefe,
            [
                ("OEU", "Vistoria de obra irregular"),
                ("FAU", "Acúmulo de resíduos no local"),
                ("AEU", "Comércio sem alvará no mesmo endereço"),
            ],
            [(oeu1, "OEU"), (fau1, "FAU"), (aeu1, "AEU")],
        )
        criar_acao(os3, oeu1, TipoAcao.relatorio_tecnico, "Relatório técnico de vistoria de obra",
                   descricao="Obra sem habite-se, estrutura em risco de desabamento.")
        criar_acao(os3, fau1, TipoAcao.interdicao, "Interdição cautelar do pavimento",
                   descricao="Retenção de volume local conforme regras do módulo FAU.")
        criar_acao(
            os3, fau1, TipoAcao.apreensao, "Apreensão cautelar de materiais",
            descricao="Materiais de construção retidos no local para regularização.",
            itens=[
                {"descricao": "Blocos de concreto", "quantidade": "120 un",
                 "custodiante": "Depósito municipal", "local_guarda": "Pátio da SUOP"},
                {"descricao": "Vigas de madeira", "quantidade": "15 un",
                 "custodiante": "Depósito municipal", "local_guarda": "Pátio da SUOP"},
            ],
        )

        os4 = criar_os(
            4, OrigemOS.sei, "Processo SEI 000123/2026 — reincidente",
            "Ceilândia", "12345678000190", -15.7902, -47.8915, 50,
            HOJE - timedelta(days=5), StatusOS.devolvida, diretor,
            [("AEU", "Reincidência - sem alvará")],
            [(aeu1, "AEU")],
        )
        criar_acao(os4, aeu1, TipoAcao.auto_infracao, "Auto de Infração - reincidência",
                   descricao="MESMA natureza da OS 1 — sistema deve marcar reincidente.",
                   auto=dict(
                       cnpj="12345678000190", razao_social="Padaria Estrela do Cerrado",
                       natureza="Exercício de atividade sem alvará de funcionamento",
                       item_legislacao="Lei Distrital XXXX",
                       valor_total=3600.00,
                       prazo_pagamento=HOJE + timedelta(days=15),
                       prazo_recurso=HOJE + timedelta(days=20),
                   ))

        os5 = criar_os(
            5, OrigemOS.ouvidoria, "Denúncia: descarte irregular de resíduos",
            "Taguatinga", None, -15.8300, -48.0600, 50,
            HOJE - timedelta(days=20), StatusOS.arquivada, chefe,
            [("FAU", "Termo de morador de rua - descarte")],
            [(fau1, "FAU")],
        )
        criar_acao(os5, fau1, TipoAcao.auto_infracao, "Auto de Infração - descarte em via pública",
                   auto=dict(
                       cnpj=None, razao_social="Pessoa física",
                       natureza="Descarte de entulho em via pública",
                       valor_total=800.00,
                       prazo_pagamento=HOJE - timedelta(days=5),
                       prazo_recurso=HOJE - timedelta(days=2),
                       status=StatusAI.arquivado, status_tributario=StatusTributario.nao_pago,
                   ))
        criar_acao(
            os5, fau1, TipoAcao.termo_morador_situacao_rua,
            "Termo de morador em situação de rua",
            descricao="Identificação e acolhimento de morador envolvido no descarte.",
            morador={
                "nome_completo": "José da Silva",
                "documento": "RG 1234567 SSP-DF",
                "data_inicio": HOJE - timedelta(days=90),
                "endereco_habitual": "Taguatinga Norte, QNL 13",
                "observacoes": "Descarte irregular de resíduos domiciliares.",
            },
        )

        os6 = criar_os(
            6, OrigemOS.programacao, "Fiscalização preventiva - feiras livres",
            "Asa Sul", None, -15.8000, -47.9000, 50,
            HOJE + timedelta(days=2), StatusOS.em_execucao, gerente,
            [("AEU", "Ronda preventiva em feiras")],
            [(aeu2, "AEU")],
        )

        db.add(CamadaGeo(
            nome="Lotes registrados - Plano Piloto",
            tipo="lotes_registrados", geojson=poly(-15.79, -15.80, -47.89, -47.88),
        ))
        db.add(CamadaGeo(
            nome="Lotes ocupados - Águas Claras",
            tipo="lotes_ocupados", geojson=poly(-15.84, -15.85, -48.03, -48.02),
        ))
        db.add(CamadaGeo(
            nome="Regiões Administrativas - Distrito Federal",
            tipo="ra", geojson=poly(-15.60, -16.10, -48.30, -47.50),
        ))

        db.commit()
        print("Seed concluído com sucesso.")
        print()
        print("Usuários (senha sisaf123, login por CPF):")
        for u in [admin, sub, chefe, diretor, gerente, aeu1, aeu2, oeu1, fau1, atend1]:
            cpf = f"{u.cpf[:3]}.{u.cpf[3:6]}.{u.cpf[6:9]}-{u.cpf[9:]}" if u.cpf else "sem CPF"
            print(f"  {cpf:18s} {u.email:26s} -> {u.nome} ({u.perfil.codigo})")
    finally:
        db.close()


if __name__ == "__main__":
    main()