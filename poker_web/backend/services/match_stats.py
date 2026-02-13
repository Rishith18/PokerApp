"""Update player stats and rating after a match ends."""

import logging
from typing import Optional

from poker_web.backend.db.connection import get_connection

logger = logging.getLogger(__name__)

# Elo K-factor
K = 32
STARTING_RATING = 1000


def _expected_score(rating_a: int, rating_b: int) -> float:
    return 1.0 / (1.0 + 10.0 ** ((rating_b - rating_a) / 400.0))


def update_player_stats_after_match(
    player1_id: str,
    player2_id: str,
    winner_seat: Optional[int],
    hands_played: int,
    bb_result_player1: float,
) -> None:
    """
    Increment games_played for both players; update wins/losses from winner_seat (0 or 1);
    optional Elo rating update; insert rating_history; insert match row.
    winner_seat: 0 = player1 won, 1 = player2 won, None = draw/incomplete.
    bb_result_player1: net result in BB for player1 (negative = loss).
    """
    if not player1_id or not player2_id:
        logger.warning("update_player_stats_after_match: missing player ids")
        return
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT rating, games_played, wins, losses FROM players WHERE user_id = %s",
                (player1_id,),
            )
            row1 = cur.fetchone()
            cur.execute(
                "SELECT rating, games_played, wins, losses FROM players WHERE user_id = %s",
                (player2_id,),
            )
            row2 = cur.fetchone()
        if not row1 or not row2:
            logger.warning("update_player_stats_after_match: player not found")
            return

        r1, r2 = int(row1["rating"]), int(row2["rating"])
        wins1, losses1 = int(row1["wins"]), int(row1["losses"])
        wins2, losses2 = int(row2["wins"]), int(row2["losses"])

        if winner_seat == 0:
            wins1 += 1
            losses2 += 1
            score1, score2 = 1.0, 0.0
        elif winner_seat == 1:
            wins2 += 1
            losses1 += 1
            score1, score2 = 0.0, 1.0
        else:
            score1, score2 = 0.5, 0.5

        # Elo
        e1 = _expected_score(r1, r2)
        e2 = _expected_score(r2, r1)
        new_r1 = round(r1 + K * (score1 - e1))
        new_r2 = round(r2 + K * (score2 - e2))
        new_r1 = max(1, new_r1)
        new_r2 = max(1, new_r2)

        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE players SET rating = %s, games_played = games_played + 1, wins = %s, losses = %s
                WHERE user_id = %s
                """,
                (new_r1, wins1, losses1, player1_id),
            )
            cur.execute(
                """
                UPDATE players SET rating = %s, games_played = games_played + 1, wins = %s, losses = %s
                WHERE user_id = %s
                """,
                (new_r2, wins2, losses2, player2_id),
            )
            cur.execute(
                "INSERT INTO rating_history (player_id, rating) VALUES (%s, %s)",
                (player1_id, new_r1),
            )
            cur.execute(
                "INSERT INTO rating_history (player_id, rating) VALUES (%s, %s)",
                (player2_id, new_r2),
            )
            cur.execute(
                """
                INSERT INTO matches (player1_id, player2_id, bb_result, hands_played)
                VALUES (%s, %s, %s, %s)
                """,
                (player1_id, player2_id, bb_result_player1, hands_played),
            )
            conn.commit()
        logger.info("Match stats updated: player1=%s player2=%s hands=%s winner_seat=%s", player1_id, player2_id, hands_played, winner_seat)
    except Exception as e:
        conn.rollback()
        logger.exception("update_player_stats_after_match failed: %s", e)
    finally:
        conn.close()
