"""Database package: connection and schema for Supabase PostgreSQL (raw SQL via psycopg2)."""

from poker_web.backend.db.connection import get_connection

__all__ = ["get_connection"]
