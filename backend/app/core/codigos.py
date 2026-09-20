"""Geração de códigos de OS por origem (Fase B).

Regras acordadas:
- Ouvidoria:  OUV-<LETRA>-<SEQ 6>            (sem sigla — pode ir para qualquer lugar)
- Programação: PFO-<LETRA>-<SEQ 3>-<SIGLA>   (sigla da unidade do criador)
- SEI:        SEI-<LETRA>-<SEQ 6>-<SIGLA>
- Excepcional: ECP-<LETRA>-<SEQ 6>-<SIGLA>

Sigla da unidade: SEINT -> SNT, UFOPE -> UFO, demais a sigla da própria unidade.
(Suref, Suarf, Ugmon e outras usam a sigla cheia, ex.: PFO-A-001-SUREF.)
Sequência por ano (letra) e, quando há sigla, por unidade.
"""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.models import OrdemServico, OrigemOS, ProgramacaoFiscal

SIGLAS_ESPECIAIS = {"SEINT": "SNT", "UFOPE": "UFO"}

CONFIG = {
    OrigemOS.ouvidoria: ("OUV", 6, False),
    OrigemOS.programacao: ("PFO", 3, True),
    OrigemOS.sei: ("SEI", 6, True),
    OrigemOS.excepcional: ("ECP", 6, True),
}


def letra_ano(ano: int) -> str:
    return chr(ord("A") + (ano - 2026))


def sigla_unidade(unidade_sigla: str) -> str:
    return SIGLAS_ESPECIAIS.get(unidade_sigla, unidade_sigla)


def gerar_codigo_os(db: Session, origem: OrigemOS, unidade_sigla: str | None, ano: int) -> str:
    prefixo, largura, com_sigla = CONFIG[origem]
    letra = letra_ano(ano)
    sigla = sigla_unidade(unidade_sigla) if (com_sigla and unidade_sigla) else None

    padrao = f"{prefixo}-{letra}-%"
    if sigla:
        padrao = f"{prefixo}-{letra}-%-{sigla}"
    filtros_os = [
        OrdemServico.codigo.is_not(None),
        OrdemServico.codigo.like(padrao),
    ]
    seq = db.scalar(
        select(func.count(OrdemServico.id)).where(*filtros_os)
    ) or 0
    if origem is OrigemOS.programacao:
        seq += db.scalar(
            select(func.count(ProgramacaoFiscal.id)).where(
                ProgramacaoFiscal.codigo.like(padrao),
            )
        ) or 0
    seq += 1

    base = f"{prefixo}-{letra}-{seq:0{largura}d}"
    return f"{base}-{sigla}" if sigla else base