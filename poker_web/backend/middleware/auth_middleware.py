"""Auth middleware: extract JWT from Authorization header and attach user to request."""

import functools
from flask import g, request, jsonify

from poker_web.backend.auth.jwt_utils import verify_token


def require_auth(f):
    """
    Decorator for routes that require a valid JWT.
    Expects Authorization: Bearer <token>.
    Sets g.user_id and g.username; optionally loads g.player from DB.
    Returns 401 JSON if missing/invalid/expired token.
    """

    @functools.wraps(f)
    def wrapped(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Invalid or expired token"}), 401
        token = auth_header[7:].strip()
        payload = verify_token(token)
        if not payload:
            return jsonify({"error": "Invalid or expired token"}), 401
        g.user_id = payload.get("userId")
        g.username = payload.get("username")
        if not g.user_id:
            return jsonify({"error": "Invalid or expired token"}), 401
        return f(*args, **kwargs)

    return wrapped
