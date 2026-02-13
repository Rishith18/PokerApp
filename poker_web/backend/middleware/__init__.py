"""Middleware: auth decorator for protected routes."""

from poker_web.backend.middleware.auth_middleware import require_auth

__all__ = ["require_auth"]
