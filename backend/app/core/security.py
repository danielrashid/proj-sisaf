import base64
import hashlib
import hmac
import json
import os
import time

from app.config import settings


def hash_senha(senha: str, salt: bytes | None = None) -> str:
    salt = salt or os.urandom(16)
    dk = hashlib.pbkdf2_hmac("sha256", senha.encode("utf-8"), salt, 120_000)
    return f"pbkdf2${salt.hex()}${dk.hex()}"


def verifica_senha(senha: str, stored: str) -> bool:
    try:
        _, salt_hex, dk_hex = stored.split("$")
        dk = hashlib.pbkdf2_hmac(
            "sha256", senha.encode("utf-8"), bytes.fromhex(salt_hex), 120_000
        )
        return hmac.compare_digest(dk.hex(), dk_hex)
    except Exception:
        return False


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    return base64.urlsafe_b64decode(data + "=" * (-len(data) % 4))


def criar_token(payload: dict, exp_minutes: int | None = None) -> str:
    exp = settings.token_expire_minutes if exp_minutes is None else exp_minutes
    body = {**payload, "iat": int(time.time()), "exp": int(time.time()) + exp * 60}
    encoded = _b64url(json.dumps(body, separators=(",", ":")).encode("utf-8"))
    sig = _b64url(
        hmac.new(
            settings.secret_key.encode(), encoded.encode("ascii"), hashlib.sha256
        ).digest()
    )
    return f"{encoded}.{sig}"


def verificar_token(token: str) -> dict | None:
    try:
        encoded, sig = token.split(".")
        expected = _b64url(
            hmac.new(
                settings.secret_key.encode(), encoded.encode("ascii"), hashlib.sha256
            ).digest()
        )
        if not hmac.compare_digest(sig, expected):
            return None
        body = json.loads(_b64url_decode(encoded))
        if body.get("exp", 0) < time.time():
            return None
        return body
    except Exception:
        return None