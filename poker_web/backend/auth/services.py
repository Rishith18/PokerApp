"""Auth services: create user and player in DB."""

import logging
from typing import Optional, Tuple

import bcrypt

from poker_web.backend.db.connection import get_connection

logger = logging.getLogger(__name__)


def hash_password(password: str) -> str:
    """Return bcrypt hash of password (as string for DB storage)."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def check_password(password: str, password_hash: str) -> bool:
    """Return True if password matches hash."""
    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            password_hash.encode("utf-8") if isinstance(password_hash, str) else password_hash,
        )
    except Exception:
        return False


def create_user_and_player(
    email: str, username: str, password: str
) -> Tuple[Optional[dict], Optional[str]]:
    """
    Insert user and player. Returns (user_row, None) or (None, error_message).
    user_row: dict with id, email, username, created_at (and player stats).
    """
    email = email.strip().lower()
    username = username.strip()
    password_hash = hash_password(password)

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Uniqueness check
            cur.execute(
                "SELECT 1 FROM users WHERE email = %s OR username = %s",
                (email, username),
            )
            if cur.fetchone():
                return None, "Email or username already in use"

            # Insert user
            cur.execute(
                """
                INSERT INTO users (email, username, password_hash)
                VALUES (%s, %s, %s)
                RETURNING id, email, username, created_at
                """,
                (email, username, password_hash),
            )
            row = cur.fetchone()
            if not row:
                return None, "Failed to create user"
            user_id = row["id"]
            user_row = dict(row)

            # Create player (user_id is PK)
            cur.execute(
                """
                INSERT INTO players (user_id, rating, games_played, wins, losses)
                VALUES (%s, 1000, 0, 0, 0)
                """,
                (user_id,),
            )
            conn.commit()

        user_row["id"] = str(user_id)
        return user_row, None
    except Exception as e:
        conn.rollback()
        logger.exception("create_user_and_player failed: %s", e)
        return None, "Registration failed"
    finally:
        conn.close()


def get_user_by_email(email: str) -> Optional[dict]:
    """Return user row (id, username, password_hash) or None."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, email, username, password_hash FROM users WHERE email = %s",
                (email.strip().lower(),),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()


def get_player_by_user_id(user_id: str) -> Optional[dict]:
    """Return player row (rating, games_played, wins, losses) or None."""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT rating, games_played, wins, losses FROM players WHERE user_id = %s",
                (str(user_id),),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()
