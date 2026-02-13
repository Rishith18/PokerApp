"""Player routes: GET /player/profile (and optional match history)."""

import logging
from flask import Blueprint, g, jsonify, request

from poker_web.backend.db.connection import get_connection
from poker_web.backend.middleware.auth_middleware import require_auth

logger = logging.getLogger(__name__)

api_player = Blueprint("player", __name__, url_prefix="/player")


@api_player.route("/profile", methods=["GET"])
@require_auth
def profile():
    """
    GET /player/profile
    Requires: Authorization: Bearer <jwt>
    Returns: { username, rating, wins, losses, games_played }
    """
    user_id = g.user_id
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT p.rating, p.games_played, p.wins, p.losses, u.username
                FROM players p
                JOIN users u ON p.user_id = u.id
                WHERE p.user_id = %s
                """,
                (user_id,),
            )
            row = cur.fetchone()
        if not row:
            return jsonify({"error": "Player not found"}), 404
        return jsonify({
            "username": row["username"],
            "rating": row["rating"],
            "wins": row["wins"],
            "losses": row["losses"],
            "games_played": row["games_played"],
        }), 200
    finally:
        conn.close()


@api_player.route("/match-history", methods=["GET"])
@require_auth
def match_history():
    """
    GET /player/match-history?limit=20&offset=0
    Returns list of matches for the authenticated player (paginated).
    """
    user_id = g.user_id
    limit = min(int(request.args.get("limit", 20)), 100)
    offset = max(int(request.args.get("offset", 0)), 0)

    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT m.id, m.player1_id, m.player2_id, m.bb_result, m.hands_played, m.created_at,
                       u1.username AS player1_username, u2.username AS player2_username
                FROM matches m
                JOIN players p1 ON p1.user_id = m.player1_id
                JOIN players p2 ON p2.user_id = m.player2_id
                JOIN users u1 ON u1.id = m.player1_id
                JOIN users u2 ON u2.id = m.player2_id
                WHERE m.player1_id = %s OR m.player2_id = %s
                ORDER BY m.created_at DESC
                LIMIT %s OFFSET %s
                """,
                (user_id, user_id, limit, offset),
            )
            rows = cur.fetchall()
        matches_list = []
        for r in rows:
            is_player1 = str(r["player1_id"]) == user_id
            bb_result_for_me = float(r["bb_result"]) if is_player1 else -float(r["bb_result"])
            opponent = r["player2_username"] if is_player1 else r["player1_username"]
            matches_list.append({
                "id": str(r["id"]),
                "opponent": opponent,
                "bb_result": bb_result_for_me,
                "hands_played": r["hands_played"],
                "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            })
        return jsonify({"matches": matches_list}), 200
    finally:
        conn.close()
