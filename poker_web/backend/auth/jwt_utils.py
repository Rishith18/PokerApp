"""JWT signing and verification for session tokens."""

import os
import time
import logging
from typing import Optional

import jwt

logger = logging.getLogger(__name__)

# Default 24 hours
JWT_EXPIRATION_HOURS = int(os.environ.get("JWT_EXPIRATION_HOURS", "24"))
JWT_ALGORITHM = "HS256"


def _get_secret() -> str:
    secret = os.environ.get("JWT_SECRET")
    if not secret:
        raise RuntimeError("JWT_SECRET environment variable is not set")
    return secret


def sign_token(user_id: str, username: str) -> str:
    """Create a JWT for the given user. Payload: userId, username, exp (24h)."""
    payload = {
        "userId": str(user_id),
        "username": username,
        "exp": int(time.time()) + JWT_EXPIRATION_HOURS * 3600,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, _get_secret(), algorithm=JWT_ALGORITHM)


def verify_token(token: str) -> Optional[dict]:
    """Verify JWT and return payload dict (userId, username, exp) or None if invalid/expired."""
    if not token or not token.strip():
        return None
    token = token.strip()
    try:
        payload = jwt.decode(
            token, _get_secret(), algorithms=[JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        logger.debug("JWT expired")
        return None
    except jwt.InvalidTokenError:
        logger.debug("JWT invalid")
        return None
