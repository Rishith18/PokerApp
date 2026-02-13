"""WebSocket authentication: map socket id to authenticated player."""

import logging
from typing import Optional

from poker_web.backend.auth.jwt_utils import verify_token
from poker_web.backend.db.connection import get_connection

logger = logging.getLogger(__name__)

# sid -> { "user_id": str, "player_id": str, "username": str }
# player_id is same as user_id (players.user_id PK)
_socket_to_user: dict = {}


def authenticate_socket(sid: str, token: str) -> bool:
    """
    Verify JWT and load player; store sid -> user/player in session.
    Returns True if auth succeeded, False otherwise.
    """
    if not token or not token.strip():
        return False
    payload = verify_token(token.strip())
    if not payload:
        return False
    user_id = payload.get("userId")
    username = payload.get("username")
    if not user_id:
        return False
    # Player id = user_id (players PK is user_id)
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM players WHERE user_id = %s",
                (user_id,),
            )
            if not cur.fetchone():
                return False
        _socket_to_user[sid] = {
            "user_id": user_id,
            "player_id": user_id,
            "username": username or "",
        }
        return True
    except Exception as e:
        logger.exception("authenticate_socket DB check failed: %s", e)
        return False
    finally:
        conn.close()


def get_player_for_socket(sid: str) -> Optional[dict]:
    """Return { user_id, player_id, username } for socket, or None if not authenticated."""
    return _socket_to_user.get(sid)


def clear_socket(sid: str) -> None:
    """Remove socket from auth map (on disconnect)."""
    _socket_to_user.pop(sid, None)
