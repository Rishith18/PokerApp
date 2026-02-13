"""In-memory room and match state for multiplayer poker.

Room: created by first player; second player joins by room_code.
Match: created when two players are in a room; holds game state and socket mappings.
"""

from __future__ import annotations

import logging
import secrets
import threading
from dataclasses import dataclass, field
from typing import Callable, Dict, Optional

from poker_web.backend.game_manager import MultiplayerGameManager

logger = logging.getLogger(__name__)

DISCONNECT_GRACE_SECONDS = 90


def _room_code() -> str:
    """Generate a short alphanumeric room code (e.g. 6 chars)."""
    return secrets.token_hex(3).upper()


@dataclass
class Room:
    """A room waiting for a second player."""

    room_code: str
    creator_sid: str
    creator_player_id: Optional[str] = None  # user_id for match stats
    joiner_sid: Optional[str] = None
    joiner_player_id: Optional[str] = None

    @property
    def is_full(self) -> bool:
        return self.joiner_sid is not None


@dataclass
class MatchSession:
    """An active heads-up match (two players, one game)."""

    room_code: str
    sockets: list = field(default_factory=list)  # [sid0, sid1] by seat
    seat_for_socket: Dict[str, int] = field(default_factory=dict)  # sid -> 0 | 1
    manager: Optional[MultiplayerGameManager] = None
    player1_id: Optional[str] = None  # user_id (seat 0)
    player2_id: Optional[str] = None  # user_id (seat 1)
    hands_played: int = 0

    def seat_for(self, sid: str) -> Optional[int]:
        return self.seat_for_socket.get(sid)

    def other_socket(self, sid: str) -> Optional[str]:
        if sid not in self.sockets:
            return None
        for s in self.sockets:
            if s != sid:
                return s
        return None


# In-memory stores
rooms: Dict[str, Room] = {}
matches: Dict[str, MatchSession] = {}  # room_code -> match
socket_to_room: Dict[str, str] = {}  # sid -> room_code (for lookup)


def create_room(creator_sid: str, creator_player_id: Optional[str] = None) -> str:
    """Create a new room; creator gets seat 0. Returns room_code."""
    code = _room_code()
    while code in rooms:
        code = _room_code()
    rooms[code] = Room(room_code=code, creator_sid=creator_sid, creator_player_id=creator_player_id)
    socket_to_room[creator_sid] = code
    logger.info(f"Room created: {code} by {creator_sid[:8]}...")
    return code


def join_room(room_code: str, joiner_sid: str, joiner_player_id: Optional[str] = None) -> Optional[str]:
    """
    Join an existing room. Joiner gets seat 1.
    Returns None if room full or invalid; else returns room_code.
    """
    code = room_code.strip().upper()
    if code not in rooms:
        return None
    room = rooms[code]
    if room.is_full:
        return None
    room.joiner_sid = joiner_sid
    room.joiner_player_id = joiner_player_id
    socket_to_room[joiner_sid] = code
    logger.info(f"Player joined room {code}")
    return code


def start_match(room_code: str) -> Optional[MatchSession]:
    """
    Create match session and first hand when both players are in the room.
    Call after join_room. Returns the MatchSession or None.
    """
    if room_code not in rooms:
        return None
    room = rooms[room_code]
    if not room.is_full:
        return None
    manager = MultiplayerGameManager()
    manager.start_hand(0)
    session = MatchSession(
        room_code=room_code,
        sockets=[room.creator_sid, room.joiner_sid],
        seat_for_socket={room.creator_sid: 0, room.joiner_sid: 1},
        manager=manager,
        player1_id=room.creator_player_id,
        player2_id=room.joiner_player_id,
        hands_played=1,  # first hand is started
    )
    matches[room_code] = session
    return session


def get_match_for_socket(sid: str) -> Optional[MatchSession]:
    """Return the match session this socket belongs to, or None."""
    code = socket_to_room.get(sid)
    if not code:
        return None
    return matches.get(code)


def remove_room_and_match(room_code: str) -> None:
    """Remove room and match; clear socket_to_room for both sockets."""
    if room_code in matches:
        session = matches[room_code]
        for s in session.sockets:
            if s:
                socket_to_room.pop(s, None)
        if getattr(session, "disconnect_timer", None):
            try:
                session.disconnect_timer.cancel()
            except Exception:
                pass
        del matches[room_code]
    if room_code in rooms:
        room = rooms[room_code]
        socket_to_room.pop(room.creator_sid, None)
        if room.joiner_sid:
            socket_to_room.pop(room.joiner_sid, None)
        del rooms[room_code]
    logger.info(f"Removed room/match: {room_code}")


def schedule_match_end(
    room_code: str,
    emit_fn: Callable,
    other_sid: str,
    on_before_remove: Optional[Callable[[], None]] = None,
) -> None:
    """Schedule match end after grace period; emit opponent_disconnected to other_sid now.
    If on_before_remove is provided, it is called before remove_room_and_match (e.g. to record stats).
    """
    if room_code not in matches:
        return
    session = matches[room_code]
    try:
        emit_fn("opponent_disconnected", {"timeout_seconds": DISCONNECT_GRACE_SECONDS}, room=other_sid)
    except Exception as e:
        logger.warning("emit opponent_disconnected failed: %s", e)

    def on_timer():
        if room_code not in matches:
            return
        try:
            emit_fn("match_end", {"reason": "opponent_left", "winner": session.seat_for(other_sid)}, room=other_sid)
        except Exception as e:
            logger.warning("emit match_end failed: %s", e)
        if on_before_remove:
            try:
                on_before_remove()
            except Exception as e:
                logger.exception("on_before_remove failed: %s", e)
        remove_room_and_match(room_code)

    t = threading.Timer(DISCONNECT_GRACE_SECONDS, on_timer)
    t.daemon = True
    session.disconnect_timer = t
    t.start()
