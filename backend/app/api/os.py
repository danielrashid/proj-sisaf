from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.codigos import gerar_codigo_os
from app.core.deps import get_current_user, registrar_log
from app.core.permissoes import usuario_tem_permissao
from app.database import get_db
from app.models.models import (
    CaixaEstado,
    Especialidade,
    OrdemServico,
    OSAuditor,
    OSFrente,
    OrigemOS,
    OsUnidadeEvento,
    ProgramacaoFiscal,
    StatusOS,
    Unidade,
    Usuario,
    VinculoFuncional,
)
from app.schemas.schemas import (
    OSAuditorCreate,
    OSCreate,
    OSTransicao,
    OrdemServicoOut,
    OuvidoriaDecisao,
)

router = APIRouter(prefix="/os", tags=["os"])

ATIVOS = {
    StatusOS.criada,
    StatusOS.vinculada,
    StatusOS.em_execucao,
    StatusOS.devolvida,
    StatusOS.desarquivada,
}

TRANSICOES: dict[StatusOS, set[StatusOS]] = {
    StatusOS.rascunho: {StatusOS.criada, StatusOS.cancelada},
    StatusOS.criada: {StatusOS.vinculada, StatusOS.cancelada},
    StatusOS.vinculada: {StatusOS.em_execucao, StatusOS.cancelada},
    StatusOS.em_execucao: {StatusOS.devolvida, StatusOS.cancelada},
    StatusOS.devolvida: {
        StatusOS.em_execucao,
        StatusOS.concluida,
        StatusOS.vinculada,
        StatusOS.cancelada,
    },
    StatusOS.concluida: {StatusOS.arquivada},
    StatusOS.arquivada: {StatusOS.desarquivada},
    StatusOS.desarquivada: {StatusOS.em_execucao, StatusOS.cancelada},
}

CARGA = (
    selectinload(OrdemServico.frentes).selectinload(OSFrente.especialidade),
    selectinload(OrdemServico.auditores).selectinload(OSAuditor.usuario),
    selectinload(OrdemServico.acoes),
)


def _unidades_do(usuario: Usuario) -> set[int]:
    return {v.unidade_id for v in usuario.vinculos if v.ativo}


def _eh_unidade_ouvidoria(usuario: Usuario) -> bool:
    for v in usuario.vinculos:
        if not v.ativo:
            continue
        nome = (v.unidade.nome or "").lower()
        if nome.startswith("ouvidoria") or v.unidade.sigla.upper() == "OUV":
            return True
    return False


def _auditor_sob_alcance(
    db: Session, auditor: Usuario, unidades_pai: set[int]
) -> bool:
    """Auditor é da própria unidade ou de unidade subordinada ao criador."""
    for v in auditor.vinculos:
        if not v.ativo:
            continue
        uid = v.unidade_id
        while uid:
            if uid in unidades_pai:
                return True
            u = db.get(Unidade, uid)
            uid = u.unidade_pai_id if u else None
    return False


def _carregar(db: Session, os_id: int) -> OrdemServico:
    os_ = db.scalar(
        select(OrdemServico).where(OrdemServico.id == os_id).options(*CARGA)
    )
    if not os_:
        raise HTTPException(404, "OS não encontrada")
    return os_


def _serializar(db: Session, os_: OrdemServico) -> OrdemServicoOut:
    return OrdemServicoOut.model_validate(os_)


def _validar_auditor(
    db: Session,
    criador: Usuario,
    usuario_id: int,
    frente_id: int | None,
    os_: OrdemServico,
) -> None:
    auditor = db.get(Usuario, usuario_id)
    if not auditor or not auditor.ativo:
        raise HTTPException(400, "Auditor não encontrado")
    vinculos = [v for v in auditor.vinculos if v.ativo]
    if not vinculos:
        raise HTTPException(400, "Auditor sem vínculo funcional ativo")

    if criador.perfil.codigo != "admin" and not _auditor_sob_alcance(
        db, auditor, _unidades_do(criador)
    ):
        raise HTTPException(
            403,
            "Atribuição apenas para auditores da sua unidade ou subordinadas (RN-09)",
        )

    if frente_id is not None:
        frente = os_.frentes and next(
            (f for f in os_.frentes if f.id == frente_id), None
        )
        if not frente:
            raise HTTPException(400, "Frente não pertence à OS")
        esp_ids = {v.especialidade_id for v in vinculos}
        if frente.especialidade_id not in esp_ids:
            raise HTTPException(
                403,
                "Auditor não possui vínculo na especialidade da frente",
            )


@router.get("", response_model=list[OrdemServicoOut])
def listar_os(
    status: StatusOS | None = None,
    especialidade_id: int | None = None,
    origem: str | None = None,
    q: str | None = None,
    prazo_dias: int | None = Query(None, ge=0, le=365),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    stmt = select(OrdemServico).options(*CARGA).order_by(OrdemServico.numero.desc())
    if status:
        stmt = stmt.where(OrdemServico.status == status)
    if origem:
        stmt = stmt.where(OrdemServico.origem == origem)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(
            or_(
                OrdemServico.tema.ilike(like),
                OrdemServico.cnpj.ilike(like),
                OrdemServico.endereco.ilike(like),
            )
        )
    if especialidade_id:
        stmt = stmt.join(OSFrente).where(OSFrente.especialidade_id == especialidade_id)
    if prazo_dias is not None:
        limite = date.today() + timedelta(days=prazo_dias)
        stmt = stmt.where(
            OrdemServico.prazo_data.is_not(None),
            OrdemServico.prazo_data <= limite,
            OrdemServico.status.in_(ATIVOS),
        )
    return db.scalars(stmt).all()


@router.get("/minhas", response_model=list[OrdemServicoOut])
def minhas_os(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    hoje = date.today()
    # PFO some da pasta: quando o auditor fecha, ou 30 dias após o prazo vencer.
    pasta_visivel = or_(
        OrdemServico.origem != OrigemOS.programacao,
        and_(
            OrdemServico.origem == OrigemOS.programacao,
            OSAuditor.fechado_em.is_(None),
            or_(
                OrdemServico.prazo_data.is_(None),
                OrdemServico.prazo_data >= hoje - timedelta(days=30),
            ),
        ),
    )
    stmt = (
        select(OrdemServico)
        .join(OSAuditor)
        .where(
            OSAuditor.usuario_id == usuario.id,
            OSAuditor.ativo,
            pasta_visivel,
        )
        .options(*CARGA)
        .order_by(OrdemServico.numero.desc())
    )
    return db.scalars(stmt).all()


@router.get("/caixa-ouvidorias", response_model=list[OrdemServicoOut])
def caixa_ouvidorias(
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    if not usuario_tem_permissao(db, usuario, "caixa_ouvidorias"):
        raise HTTPException(403, "Sem permissão caixa_ouvidorias")

    stmt = (
        select(OrdemServico)
        .options(*CARGA)
        .where(OrdemServico.origem == OrigemOS.ouvidoria)
    )
    if _eh_unidade_ouvidoria(usuario):
        # A caixa da Ouvidoria mostra o que já voltou da qualidade.
        stmt = stmt.where(
            OrdemServico.caixa_estado == CaixaEstado.devolvida_ouvidoria.value
        )
    else:
        unidades = _unidades_do(usuario)
        stmt = stmt.where(
            OrdemServico.unidade_responsavel_id.in_(unidades),
            OrdemServico.caixa_estado.in_(
                [
                    CaixaEstado.na_caixa.value,
                    CaixaEstado.aguardando_qualidade.value,
                ]
            ),
        )
    return db.scalars(stmt.order_by(OrdemServico.numero.desc())).all()


@router.get("/{os_id}", response_model=OrdemServicoOut)
def detalhar_os(
    os_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)
):
    return _serializar(db, _carregar(db, os_id))


@router.post("/{os_id}/retornar", response_model=OrdemServicoOut)
def retornar_os(
    os_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    os_ = _carregar(db, os_id)
    if os_.origem not in (
        OrigemOS.ouvidoria,
        OrigemOS.excepcional,
        OrigemOS.sei,
    ):
        raise HTTPException(400, "Retorno apenas para OS de Ouvidoria, ECP ou SEI")
    if os_.status in (StatusOS.arquivada, StatusOS.cancelada):
        raise HTTPException(400, "OS arquivada/cancelada não retorna")

    meus = [a for a in os_.auditores if a.usuario_id == usuario.id and a.ativo]
    if not meus:
        raise HTTPException(403, "Somente o auditor responsável pode retornar")

    for a in meus:
        a.ativo = False
        a.retornado_em = datetime.now()

    if os_.origem == OrigemOS.ouvidoria:
        os_.caixa_estado = CaixaEstado.aguardando_qualidade.value

    registrar_log(
        db, usuario.id, "ordem_servico", os_.id, "retornar_os",
        {"origem": os_.origem.value, "caixa_estado": os_.caixa_estado},
        request=request,
    )
    db.commit()
    return _serializar(db, _carregar(db, os_id))


@router.post("/{os_id}/fechar-pasta", response_model=OrdemServicoOut)
def fechar_pasta(
    os_id: int,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    os_ = _carregar(db, os_id)
    if os_.origem != OrigemOS.programacao:
        raise HTTPException(400, "Fechar pasta vale apenas para OS tipo PFO")

    meu = next(
        (a for a in os_.auditores if a.usuario_id == usuario.id and a.ativo), None
    )
    if not meu:
        raise HTTPException(403, "Você não está vinculado a esta PFO")

    meu.fechado_em = datetime.now()
    registrar_log(
        db, usuario.id, "ordem_servico", os_.id, "fechar_pasta", {}, request=request
    )
    db.commit()
    return _serializar(db, _carregar(db, os_id))


@router.post("/{os_id}/caixa", response_model=OrdemServicoOut)
def decidir_caixa(
    os_id: int,
    body: OuvidoriaDecisao,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    if not usuario_tem_permissao(db, usuario, "caixa_ouvidorias"):
        raise HTTPException(403, "Sem permissão caixa_ouvidorias")

    os_ = _carregar(db, os_id)
    if os_.origem != OrigemOS.ouvidoria:
        raise HTTPException(400, "Decisão de caixa apenas para OS de Ouvidoria")
    if os_.unidade_responsavel_id not in _unidades_do(usuario):
        raise HTTPException(403, "Decisão somente na caixa da sua unidade")

    if body.decisao == "devolver_ouvidoria":
        os_.caixa_estado = CaixaEstado.devolvida_ouvidoria.value
        ouv = db.scalar(
            select(Unidade).where(
                or_(
                    Unidade.sigla.ilike("OUV"),
                    Unidade.nome.ilike("Ouvidoria%"),
                )
            )
        )
        if ouv:
            db.add(
                OsUnidadeEvento(
                    os_id=os_.id,
                    unidade_id=ouv.id,
                    papel="ouvidoria",
                    criado_por_id=usuario.id,
                )
            )
        registrar_log(
            db, usuario.id, "ordem_servico", os_.id,
            "caixa_devolver_ouvidoria", {}, request=request,
        )
    elif body.decisao == "redistribuir":
        if not body.auditores:
            raise HTTPException(400, "Redistribuição exige ao menos um auditor")
        for item in body.auditores:
            _validar_auditor(db, usuario, item.usuario_id, item.frente_id, os_)
            db.add(
                OSAuditor(
                    os_id=os_.id,
                    usuario_id=item.usuario_id,
                    frente_id=item.frente_id,
                    atribuido_por_id=usuario.id,
                )
            )
        os_.caixa_estado = CaixaEstado.distribuida.value
        if os_.status == StatusOS.criada:
            os_.status = StatusOS.vinculada
        registrar_log(
            db, usuario.id, "ordem_servico", os_.id, "caixa_redistribuir",
            {"auditores": len(body.auditores)}, request=request,
        )
    else:
        raise HTTPException(400, "decisao inválida")

    db.commit()
    return _serializar(db, _carregar(db, os_id))


@router.post("", response_model=OrdemServicoOut, status_code=201)
def criar_os(
    body: OSCreate,
    request: Request,
    db: Session = Depends(get_db),
    criador: Usuario = Depends(get_current_user),
):
    if body.origem == OrigemOS.ouvidoria:
        if not _eh_unidade_ouvidoria(criador):
            raise HTTPException(403, "Apenas a unidade Ouvidoria cria OS de Ouvidoria")
        if not body.unidade_responsavel_id:
            raise HTTPException(400, "Informe a unidade responsável (encaminhamento)")
        alvo = db.get(Unidade, body.unidade_responsavel_id)
        if not alvo or not alvo.ativo:
            raise HTTPException(400, "Unidade responsável inválida")
        if alvo.unidade_pai_id is not None:
            raise HTTPException(400, "Encaminhar apenas para unidades pai")
    elif body.origem == OrigemOS.programacao:
        # A OS tipo PFO nasce direto (sem rascunho), criada por quem criou a PFO.
        nivel_chefe = criador.perfil.nivel >= 6 or (
            criador.perfil.nivel >= 3 and bool(_unidades_do(criador))
        )
        if not nivel_chefe:
            raise HTTPException(403, "Apenas Subsecretário(a)/Chefe cria OS tipo PFO")
        if not body.pfo_id:
            raise HTTPException(400, "OS tipo PFO exige a PFO de referência")
        pfo = db.get(ProgramacaoFiscal, body.pfo_id)
        if not pfo:
            raise HTTPException(400, "PFO de referência não encontrada")
        body.raio_geo = body.raio_geo or pfo.raio_geo
        if not body.tema:
            body.tema = pfo.tema
    else:
        if criador.perfil.nivel < 2:
            raise HTTPException(403, "Apenas gerente e acima criam OS (RN-09)")

    if not body.frentes:
        raise HTTPException(400, "Informe ao menos uma frente (especialidade)")
    for f in body.frentes:
        if not db.get(Especialidade, f.especialidade_id):
            raise HTTPException(400, "Especialidade inválida")

    ultimo = db.scalar(select(func.max(OrdemServico.numero)))
    unidade_sigla = criador.vinculos[0].unidade.sigla if criador.vinculos else None
    os_ = OrdemServico(
        numero=(ultimo or 0) + 1,
        codigo=gerar_codigo_os(db, body.origem, unidade_sigla, date.today().year),
        origem=body.origem,
        tema=body.tema,
        ra=body.ra,
        cnpj=body.cnpj,
        endereco=body.endereco,
        latitude=body.latitude,
        longitude=body.longitude,
        raio_geo=body.raio_geo,
        prazo_data=body.prazo_data,
        descricao=body.descricao,
        status=StatusOS.criada,
        caixa_estado=(
            CaixaEstado.na_caixa.value
            if body.origem == OrigemOS.ouvidoria
            else None
        ),
        unidade_responsavel_id=body.unidade_responsavel_id,
        pfo_id=body.pfo_id,
        fundamentacao_legal=(
            db.get(ProgramacaoFiscal, body.pfo_id).fundamentacao_legal
            if body.origem == OrigemOS.programacao and body.pfo_id
            else None
        ),
        criado_por_id=criador.id,
    )
    db.add(os_)
    db.flush()

    if body.origem == OrigemOS.ouvidoria and body.unidade_responsavel_id:
        db.add(
            OsUnidadeEvento(
                os_id=os_.id,
                unidade_id=body.unidade_responsavel_id,
                papel="responsavel",
                criado_por_id=criador.id,
            )
        )

    frentes: dict[int, OSFrente] = {}
    for f in body.frentes:
        frente = OSFrente(os_id=os_.id, especialidade_id=f.especialidade_id, descricao=f.descricao)
        db.add(frente)
        frentes[f.especialidade_id] = frente
    db.flush()

    for a in body.auditores:
        _validar_auditor(db, criador, a["usuario_id"], a.get("frente_id"), os_)
        db.add(
            OSAuditor(
                os_id=os_.id,
                usuario_id=a["usuario_id"],
                frente_id=a.get("frente_id"),
                atribuido_por_id=criador.id,
            )
        )

    registrar_log(
        db, criador.id, "ordem_servico", os_.id, "criar_os",
        {"codigo": os_.codigo, "numero": os_.numero, "origem": os_.origem.value,
         "tema": os_.tema, "frentes": len(body.frentes)},
        request=request,
    )
    db.commit()
    return _serializar(db, _carregar(db, os_.id))


@router.post("/{os_id}/atribuir", response_model=OrdemServicoOut)
def atribuir_auditores(
    os_id: int,
    body: list[OSAuditorCreate],
    request: Request,
    db: Session = Depends(get_db),
    criador: Usuario = Depends(get_current_user),
):
    os_ = _carregar(db, os_id)
    if os_.status not in (StatusOS.criada, StatusOS.vinculada, StatusOS.em_execucao, StatusOS.devolvida):
        raise HTTPException(400, f"Não é possível atribuir auditores no status {os_.status.value}")

    for item in body:
        _validar_auditor(db, criador, item.usuario_id, item.frente_id, os_)
        db.add(
            OSAuditor(
                os_id=os_.id,
                usuario_id=item.usuario_id,
                frente_id=item.frente_id,
                atribuido_por_id=criador.id,
            )
        )
    if os_.status == StatusOS.criada:
        os_.status = StatusOS.vinculada
    if os_.origem == OrigemOS.ouvidoria:
        os_.caixa_estado = CaixaEstado.distribuida.value

    registrar_log(db, criador.id, "ordem_servico", os_.id, "atribuir_auditores", {"auditores": len(body)}, request=request)
    db.commit()
    return _serializar(db, _carregar(db, os_id))


@router.post("/{os_id}/transicao", response_model=OrdemServicoOut)
def transicionar(
    os_id: int,
    body: OSTransicao,
    request: Request,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    os_ = _carregar(db, os_id)
    permitidos = TRANSICOES.get(os_.status, set())
    if body.status not in permitidos:
        raise HTTPException(
            400,
            f"Transição inválida: {os_.status.value} → {body.status.value}. Permitidas: {[s.value for s in permitidos]}",
        )

    if body.status == StatusOS.vinculada and not any(a.ativo for a in os_.auditores):
        raise HTTPException(400, "Vincule ao menos um auditor antes de vincular a OS")

    de = os_.status.value
    os_.status = body.status
    registrar_log(
        db, usuario.id, "ordem_servico", os_.id, "transicao",
        {"de": de, "para": body.status.value},
        request=request,
    )
    db.commit()
    return _serializar(db, _carregar(db, os_id))