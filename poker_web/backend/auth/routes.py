"""Auth routes: register and login."""

import logging
from flask import Blueprint, jsonify, request

from poker_web.backend.app import limiter
from poker_web.backend.auth.validation import validate_register
from poker_web.backend.auth.services import (
    create_user_and_player,
    get_user_by_email,
    check_password,
    get_player_by_user_id,
)
from poker_web.backend.auth.jwt_utils import sign_token

logger = logging.getLogger(__name__)

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


def _user_response(user_row: dict, player_row: dict, token: str):
    """Build JSON response with token, user, and player."""
    return jsonify({
        "token": token,
        "user": {
            "id": str(user_row["id"]),
            "email": user_row["email"],
            "username": user_row["username"],
        },
        "player": {
            "rating": player_row["rating"],
            "games_played": player_row["games_played"],
            "wins": player_row["wins"],
            "losses": player_row["losses"],
        },
    })


@auth_bp.route("/register", methods=["POST"])
@limiter.limit("5 per minute")
def register():
    """
    POST /auth/register
    Body: { "email": str, "username": str, "password": str }
    Returns: 201 { token, user, player } or 400/409 with error.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    email = (data.get("email") or "").strip()
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    ok, err = validate_register(email, username, password)
    if not ok:
        return jsonify({"error": err}), 400

    user_row, err = create_user_and_player(email, username, password)
    if err:
        status = 409 if "already in use" in err else 400
        return jsonify({"error": err}), status

    token = sign_token(str(user_row["id"]), user_row["username"])
    player_row = {
        "rating": 1000,
        "games_played": 0,
        "wins": 0,
        "losses": 0,
    }
    return _user_response(user_row, player_row, token), 201


@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    """
    POST /auth/login
    Body: { "email": str, "password": str }
    Returns: 200 { token, user, player } or 401.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    user = get_user_by_email(email)
    if not user:
        return jsonify({"error": "Invalid email or password"}), 401

    if not check_password(password, user["password_hash"]):
        return jsonify({"error": "Invalid email or password"}), 401

    player = get_player_by_user_id(str(user["id"]))
    if not player:
        return jsonify({"error": "Player record not found"}), 500

    token = sign_token(str(user["id"]), user["username"])
    user_response = {
        "id": str(user["id"]),
        "email": user["email"],
        "username": user["username"],
    }
    return _user_response(
        user_response,
        player,
        token,
    ), 200
