import socket

from fastapi import APIRouter

from app.config import settings

router = APIRouter(tags=["sistema"])

VERSAO = "0.2.0"
HOST = socket.gethostname()


def _ip_local() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("10.255.255.255", 1))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return ""


@router.get("/sistema/info")
def info():
    ip = _ip_local()
    sufixo = ip.rsplit(".", 1)[-1] if ip.count(".") >= 3 else ip
    return {
        "nome": "SISAF",
        "versao": VERSAO,
        "host": HOST,
        "ip": ip,
        "sufixo": settings.instancia_sufixo or sufixo,
        "ambiente": settings.environment,
    }