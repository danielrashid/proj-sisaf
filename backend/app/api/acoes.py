from datetime import date, datetime
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import get_current_user, registrar_log
from app.database import get_db
from app.models.models import (
    AcaoFiscal,
    AutoInfracao,
    ItensApreensao,
    MedidaStatus,
    OrdemServico,
    Reincidencia,
    StatusAI,
    StatusDocumento,
    StatusTributario,
    TermoMoradorSitRua,
    TipoAcao,
    TipoDocumento,
    Tramite,
    Usuario,
)
from app.schemas.schemas import (
    AcaoFiscalOut,
    AutoInfracaoCreate,
    AutoInfracaoLista,
    ItensApreensaoIn,
    MinhaAcaoOut,
    TermoMoradorSitRuaIn,
    TipoDocumentoOut,
)

router = APIRouter(tags=["acoes"])


class AcaoCompleta(BaseModel):
    tipo: TipoAcao
    titulo: str
    descricao: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    auto_infracao: AutoInfracaoCreate | None = None
    itens_apreensao: list[ItensApreensaoIn] | None = None
    termo_morador: TermoMoradorSitRuaIn | None = None
    medida_status: MedidaStatus | None = None


class EdicaoIn(AcaoCompleta):
    justificativa: str


class AvaliacaoIn(BaseModel):
    decisao: Literal["aprovar", "rejeitar"]
    parecer: str | None = None


class EmitirIn(BaseModel):
    numero_auto: str | None = None


def _pode_atuar(os_: OrdemServico, usuario: Usuario) -> bool:
    if usuario.perfil.nivel >= 3:
        return True
    return any(a.usuario_id == usuario.id and a.ativo for a in os_.auditores)


def _requer_autor(os_: OrdemServico, acao: AcaoFiscal, usuario: Usuario) -> None:
    if acao.auditor_id == usuario.id:
        return
    if _pode_atuar(os_, usuario):
        return
    raise HTTPException(
        403, "Somente o autor do documento ou a gerência pode operar"
    )


def _chefe_da_unidade(db: Session, acao: AcaoFiscal, usuario: Usuario) -> bool:
    if usuario.perfil.nivel >= 6:
        return True
    auditor = db.get(Usuario, acao.auditor_id)
    if not auditor:
        return False
    unidades_auditor = {v.unidade_id for v in auditor.vinculos if v.ativo}
    if not unidades_auditor:
        return False
    for v in usuario.vinculos:
        if (
            v.ativo
            and usuario.perfil.nivel >= 3
            and v.unidade_id in unidades_auditor
        ):
            return True
    return False


def _get_doc(db: Session, acao_id: int) -> AcaoFiscal:
    acao = db.scalar(
        select(AcaoFiscal)
        .where(AcaoFiscal.id == acao_id)
        .options(
            selectinload(AcaoFiscal.os),
            selectinload(AcaoFiscal.tipo_documento),
            selectinload(AcaoFiscal.auto_infracao),
            selectinload(AcaoFiscal.itens_apreensao),
            selectinload(AcaoFiscal.termo_morador),
            selectinload(AcaoFiscal.tramites).selectinload(Tramite.usuario),
            selectinload(AcaoFiscal.tramites).selectinload(Tramite.autorizado_por),
        )
    )
    if not acao:
        raise HTTPException(404, "Documento não encontrado")
    return acao


def _tipo_documento(db: Session, tipo: TipoAcao) -> TipoDocumento:
    td = db.scalar(
        select(TipoDocumento).where(TipoDocumento.chave == tipo.value)
    )
    if not td or not td.ativo:
        raise HTTPException(400, f"Tipo de documento '{tipo.value}' indisponível")
    return td


def _letra_ano(ano: int) -> str:
    return chr(ord("A") + (ano - 2026))


def _sigla_especialidade(db: Session, auditor: Usuario) -> str:
    vinculos = [v for v in auditor.vinculos if v.ativo]
    if not vinculos:
        return "SIS"
    return vinculos[0].especialidade.sigla


def _gerar_codigo(db: Session, td: TipoDocumento, auditor: Usuario) -> str:
    ano = date.today().year
    letra = _letra_ano(ano)
    prefixo = td.prefixo
    seq = db.scalar(
        select(func.count())
        .select_from(AcaoFiscal)
        .where(AcaoFiscal.codigo_documento.like(f"{prefixo}-{letra}-%"))
    ) or 0
    sigla = _sigla_especialidade(db, auditor)
    return f"{prefixo}-{letra}-{auditor.id:04d}-{seq + 1:06d}-{sigla}"


def _gerar_ai(db: Session, acao: AcaoFiscal, dados: AutoInfracaoCreate) -> AutoInfracao:
    ai = AutoInfracao(
        acao_id=acao.id,
        cnpj=dados.cnpj,
        razao_social=dados.razao_social,
        natureza=dados.natureza,
        item_legislacao=dados.item_legislacao,
        valor_total=dados.valor_total,
        prazo_pagamento=dados.prazo_pagamento,
        prazo_recurso=dados.prazo_recurso,
        status=StatusAI.lavrado,
        status_tributario=StatusTributario.pendente,
        observacoes=dados.observacoes,
    )
    if dados.cnpj and dados.natureza:
        anteriores = db.scalars(
            select(AutoInfracao).where(
                AutoInfracao.cnpj == dados.cnpj,
                AutoInfracao.natureza == dados.natureza,
            )
        ).all()
        if anteriores:
            ai.reincidente = True
            db.add(ai)
            db.flush()
            db.add(
                Reincidencia(
                    ai_id=ai.id,
                    cnpj=dados.cnpj,
                    natureza=dados.natureza,
                    numero_ocorrencia=len(anteriores) + 1,
                )
            )
    return ai


def _aplicar_dados(db: Session, acao: AcaoFiscal, dados: AcaoCompleta) -> None:
    for campo in ("titulo", "descricao", "latitude", "longitude"):
        valor = getattr(dados, campo, None)
        if valor is not None:
            setattr(acao, campo, valor)
    if dados.medida_status is not None:
        acao.medida_status = dados.medida_status
    if dados.auto_infracao is not None:
        if acao.auto_infracao:
            for k, v in dados.auto_infracao.model_dump().items():
                if v is not None:
                    setattr(acao.auto_infracao, k, v)
        else:
            db.add(_gerar_ai(db, acao, dados.auto_infracao))
    if dados.itens_apreensao is not None:
        acao.itens_apreensao.clear()
        for item in dados.itens_apreensao:
            acao.itens_apreensao.append(ItensApreensao(**item.model_dump()))
    if dados.termo_morador is not None:
        if acao.termo_morador:
            for k, v in dados.termo_morador.model_dump().items():
                setattr(acao.termo_morador, k, v)
        else:
            acao.termo_morador = TermoMoradorSitRua(**dados.termo_morador.model_dump())


def _aplicar_edicao_pendente(db: Session, acao: AcaoFiscal) -> None:
    pendente = acao.dados_edicao_pendente or {}
    if "titulo" in pendente:
        acao.titulo = pendente["titulo"]
    if "descricao" in pendente:
        acao.descricao = pendente["descricao"]
    if "latitude" in pendente:
        acao.latitude = pendente["latitude"]
    if "longitude" in pendente:
        acao.longitude = pendente["longitude"]
    if "medida_status" in pendente:
        acao.medida_status = pendente["medida_status"]
    ai = pendente.get("auto_infracao")
    if ai is not None:
        if acao.auto_infracao:
            for k, v in ai.items():
                if v is not None:
                    setattr(acao.auto_infracao, k, v)
        elif ai.get("natureza"):
            db.add(_gerar_ai(db, acao, AutoInfracaoCreate(**ai)))
    itens = pendente.get("itens_apreensao")
    if itens is not None:
        acao.itens_apreensao.clear()
        for item in itens:
            acao.itens_apreensao.append(ItensApreensao(**item))
    morador = pendente.get("termo_morador")
    if morador is not None:
        if acao.termo_morador:
            for k, v in morador.items():
                setattr(acao.termo_morador, k, v)
        elif morador.get("nome_completo"):
            acao.termo_morador = TermoMoradorSitRua(**morador)
    acao.dados_edicao_pendente = None
    acao.justificativa = None


@router.post("/os/{os_id}/acoes", response_model=AcaoFiscalOut, status_code=201)
def registrar_acao(
    os_id: int,
    body: AcaoCompleta,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    os_ = db.get(OrdemServico, os_id)
    if not os_:
        raise HTTPException(404, "OS não encontrada")
    if not _pode_atuar(os_, usuario):
        raise HTTPException(403, "Somente auditor vinculado à OS pode registrar ação")

    td = _tipo_documento(db, body.tipo)
    if td.usa_auto_infracao and not body.auto_infracao:
        raise HTTPException(400, "O documento requer os dados da autuação")
    if td.usa_itens_apreensao and not body.itens_apreensao:
        raise HTTPException(400, "O documento requer ao menos um item apreendido")

    acao = AcaoFiscal(
        os_id=os_id,
        auditor_id=usuario.id,
        tipo=body.tipo,
        titulo=body.titulo,
        descricao=body.descricao,
        latitude=body.latitude,
        longitude=body.longitude,
        tipo_documento_id=td.id,
        status_documento=StatusDocumento.rascunho,
    )
    if td.usa_medida:
        acao.medida_status = body.medida_status or MedidaStatus.mantida
    db.add(acao)
    db.flush()

    if td.usa_auto_infracao and body.auto_infracao:
        db.add(_gerar_ai(db, acao, body.auto_infracao))
    if td.usa_itens_apreensao and body.itens_apreensao:
        for item in body.itens_apreensao:
            db.add(ItensApreensao(acao_id=acao.id, **item.model_dump()))
    if td.usa_morador_sit_rua and body.termo_morador:
        db.add(TermoMoradorSitRua(acao_id=acao.id, **body.termo_morador.model_dump()))

    registrar_log(
        db,
        usuario.id,
        "acao_fiscal",
        acao.id,
        "criar_acao",
        {"os_id": os_id, "tipo": body.tipo.value, "titulo": body.titulo},
        request=request,
    )
    db.commit()
    db.refresh(acao)
    return AcaoFiscalOut.model_validate(acao)


@router.get("/tipos-documento", response_model=list[TipoDocumentoOut])
def listar_tipos_documento(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return db.scalars(
        select(TipoDocumento)
        .where(TipoDocumento.ativo)
        .order_by(TipoDocumento.categoria, TipoDocumento.ordem)
    ).all()


@router.get("/acoes/minhas", response_model=list[MinhaAcaoOut])
def minhas_acoes(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    stmt = (
        select(AcaoFiscal)
        .where(AcaoFiscal.auditor_id == usuario.id)
        .options(
            selectinload(AcaoFiscal.auto_infracao),
            selectinload(AcaoFiscal.os),
        )
        .order_by(AcaoFiscal.criado_em.desc())
        .limit(30)
    )
    resultado = []
    for acao in db.scalars(stmt):
        item = MinhaAcaoOut.model_validate(acao)
        item.os_numero = acao.os.numero
        item.os_tema = acao.os.tema
        item.os_status = acao.os.status
        resultado.append(item)
    return resultado


@router.get("/acoes/{acao_id}", response_model=AcaoFiscalOut)
def detalhe_documento(
    acao_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return _get_doc(db, acao_id)


@router.put("/acoes/{acao_id}", response_model=AcaoFiscalOut)
def editar_rascunho(
    acao_id: int,
    body: AcaoCompleta,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    acao = _get_doc(db, acao_id)
    _requer_autor(acao.os, acao, usuario)
    if acao.status_documento != StatusDocumento.rascunho:
        raise HTTPException(
            400,
            "Edição livre apenas em rascunho; use a edição controlada com justificativa",
        )
    _aplicar_dados(db, acao, body)
    registrar_log(
        db,
        usuario.id,
        "acao_fiscal",
        acao.id,
        "editar_rascunho",
        {"titulo": body.titulo},
        request=request,
    )
    db.commit()
    db.refresh(acao)
    return acao


@router.post("/acoes/{acao_id}/emitir", response_model=AcaoFiscalOut)
def emitir_documento(
    acao_id: int,
    body: EmitirIn,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    acao = _get_doc(db, acao_id)
    _requer_autor(acao.os, acao, usuario)
    if acao.status_documento != StatusDocumento.rascunho:
        raise HTTPException(400, "Somente documentos em rascunho podem ser emitidos")
    td = acao.tipo_documento or _tipo_documento(db, acao.tipo)
    if td.numero_do_tablet:
        numero = (body.numero_auto or "").strip()
        if not numero:
            raise HTTPException(
                400, "Autos vêm numerados do tablet — informe o número lavrado"
            )
        acao.codigo_documento = numero
    else:
        if not td.prefixo:
            raise HTTPException(400, "Tipo de documento sem prefixo de numeração")
        acao.codigo_documento = _gerar_codigo(db, td, acao.auditor)

    acao.status_documento = StatusDocumento.emitido
    acao.emitido_em = datetime.utcnow()
    db.add(
        Tramite(
            acao_id=acao.id,
            usuario_id=usuario.id,
            acao="emitir",
            de_status="rascunho",
            para_status="emitido",
            dados={"codigo_documento": acao.codigo_documento},
        )
    )
    registrar_log(
        db,
        usuario.id,
        "acao_fiscal",
        acao.id,
        "emitir_documento",
        {"codigo_documento": acao.codigo_documento},
        request=request,
    )
    db.commit()
    db.refresh(acao)
    return acao


@router.post("/acoes/{acao_id}/edicao", response_model=AcaoFiscalOut)
def solicitar_edicao(
    acao_id: int,
    body: EdicaoIn,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    acao = _get_doc(db, acao_id)
    _requer_autor(acao.os, acao, usuario)
    if acao.status_documento not in (
        StatusDocumento.emitido,
        StatusDocumento.devolvido,
    ):
        raise HTTPException(
            400, "Edição pós-emissão só é possível para documento emitido ou devolvido"
        )
    if acao.status_documento == StatusDocumento.emitido:
        if acao.dados_edicao_pendente:
            raise HTTPException(
                400, "Já existe uma edição aguardando avaliação do diretor"
            )
        de_status = "emitido"
    else:
        de_status = "devolvido"
    if not body.justificativa.strip():
        raise HTTPException(400, "Justificativa obrigatória para edição pós-emissão")

    acao.justificativa = body.justificativa
    acao.dados_edicao_pendente = body.model_dump(exclude={"justificativa"})
    acao.status_documento = StatusDocumento.aguardando_avaliacao
    db.add(
        Tramite(
            acao_id=acao.id,
            usuario_id=usuario.id,
            acao="edicao_solicitada",
            de_status=de_status,
            para_status="aguardando_avaliacao",
            justificativa=body.justificativa,
            dados={"campos": sorted(body.model_dump(exclude={"justificativa"}).keys())},
        )
    )
    registrar_log(
        db,
        usuario.id,
        "acao_fiscal",
        acao.id,
        "solicitar_edicao",
        {"justificativa": body.justificativa},
        request=request,
    )
    db.commit()
    db.refresh(acao)
    return acao


@router.post("/acoes/{acao_id}/avaliar", response_model=AcaoFiscalOut)
def avaliar_edicao(
    acao_id: int,
    body: AvaliacaoIn,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    acao = _get_doc(db, acao_id)
    if acao.status_documento != StatusDocumento.aguardando_avaliacao:
        raise HTTPException(400, "Não há edição aguardando avaliação")
    if not _chefe_da_unidade(db, acao, usuario):
        raise HTTPException(
            403, "Somente o chefe da unidade do auditor pode avaliar a edição"
        )

    if body.decisao == "aprovar":
        _aplicar_edicao_pendente(db, acao)
        acao.status_documento = StatusDocumento.emitido
        para_status = "emitido"
        acao_tramite = "edicao_aprovada"
    else:
        acao.status_documento = StatusDocumento.devolvido
        para_status = "devolvido"
        acao_tramite = "edicao_rejeitada"

    acao.justificativa = body.parecer
    db.add(
        Tramite(
            acao_id=acao.id,
            usuario_id=usuario.id,
            autorizado_por_id=usuario.id,
            acao=acao_tramite,
            de_status="aguardando_avaliacao",
            para_status=para_status,
            justificativa=body.parecer,
        )
    )
    registrar_log(
        db,
        usuario.id,
        "acao_fiscal",
        acao.id,
        "avaliar_edicao",
        {"decisao": body.decisao, "parecer": body.parecer},
        request=request,
    )
    db.commit()
    db.refresh(acao)
    return acao


@router.post("/acoes/{acao_id}/juntar", response_model=AcaoFiscalOut)
def juntar_documento(
    acao_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    acao = _get_doc(db, acao_id)
    _requer_autor(acao.os, acao, usuario)
    if acao.status_documento != StatusDocumento.emitido:
        raise HTTPException(
            400, "Somente documentos emitidos podem ser juntados ao processo"
        )
    acao.status_documento = StatusDocumento.juntado
    acao.juntado_em = datetime.utcnow()
    db.add(
        Tramite(
            acao_id=acao.id,
            usuario_id=usuario.id,
            acao="juntar",
            de_status="emitido",
            para_status="juntado",
        )
    )
    registrar_log(
        db,
        usuario.id,
        "acao_fiscal",
        acao.id,
        "juntar_documento",
        {"codigo_documento": acao.codigo_documento},
        request=request,
    )
    db.commit()
    db.refresh(acao)
    return acao


@router.get("/autos", response_model=list[AutoInfracaoLista])
def listar_autos(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    stmt = (
        select(AutoInfracao)
        .options(selectinload(AutoInfracao.acao).selectinload(AcaoFiscal.os))
        .order_by(AutoInfracao.id.desc())
    )
    autos = []
    for ai in db.scalars(stmt):
        autos.append(
            AutoInfracaoLista(
                id=ai.id,
                acao_id=ai.acao_id,
                cnpj=ai.cnpj,
                razao_social=ai.razao_social,
                natureza=ai.natureza,
                item_legislacao=ai.item_legislacao,
                valor_total=ai.valor_total,
                prazo_pagamento=ai.prazo_pagamento,
                prazo_recurso=ai.prazo_recurso,
                status=ai.status,
                status_tributario=ai.status_tributario,
                reincidente=ai.reincidente,
                observacoes=ai.observacoes,
                os_id=ai.acao.os_id,
                os_numero=ai.acao.os.numero,
                tema=ai.acao.os.tema,
            )
        )
    return autos