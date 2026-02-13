"""Database connection for Supabase PostgreSQL using psycopg2.

Uses DATABASE_URL environment variable (Supabase connection string).
"""

import os
import logging
from typing import Optional

import psycopg2
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


def get_connection():
    """Return a new psycopg2 connection. Caller must close it or use as context manager."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    return psycopg2.connect(url, cursor_factory=RealDictCursor)


def get_connection_or_none():
    """Return a connection if DATABASE_URL is set, else None. Useful for optional DB features."""
    if not os.environ.get("DATABASE_URL"):
        return None
    try:
        return get_connection()
    except Exception as e:
        logger.warning("Database connection failed: %s", e)
        return None
