"""
Token encryption using Fernet (symmetric, AES-128-CBC + HMAC-SHA256).
ENCRYPTION_KEY must be a valid Fernet key: base64url(32 random bytes).
Generate: python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""
from cryptography.fernet import Fernet
from app.core.config import settings


def _fernet() -> Fernet:
    key = settings.ENCRYPTION_KEY
    if not key:
        raise RuntimeError("ENCRYPTION_KEY not set in .env")
    return Fernet(key.encode() if isinstance(key, str) else key)


def encrypt_token(token: str) -> bytes:
    """Encrypt a plaintext token. Returns encrypted bytes."""
    return _fernet().encrypt(token.encode())


def decrypt_token(encrypted: bytes) -> str:
    """Decrypt encrypted bytes. Returns plaintext token."""
    return _fernet().decrypt(encrypted).decode()


def safe_decrypt(encrypted: bytes | None) -> str | None:
    """Decrypt without raising — returns None on failure."""
    if not encrypted:
        return None
    try:
        return decrypt_token(encrypted)
    except Exception:
        return None
