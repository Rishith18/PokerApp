"""WebSocket event handlers for multiplayer poker."""

from __future__ import annotations

import logging
import threading
from flask import request as flask_request
from flask_socketio import emit

from poker_web.backend.game_manager import _parse_action_string_static
from poker_web.backend.rooms import (
    create_room,
    join_room,
    start_match,
    get_match_for_socket,
    remove_room_and_match,
    schedule_match_end,
    rooms,
    matches,
    socket_to_room,
)
from poker_web.backend.sockets.auth import authenticate_socket, get_player_for_socket, clear_socket
from poker_web.backend.services.match_stats import update_player_stats_after_match

logger = logging.getLogger(__name__)

SHOWDOWN_DELAY_SECONDS = 3


def register_socket_events(socketio):
    """Register all socket event handlers."""

    @socketio.on("connect")
    def on_connect(auth=None):
        """Require JWT on connect. Reject connection if token missing or invalid."""
        token = None
        if auth and isinstance(auth, dict):
            token = auth.get("token")
        if not token:
            token = flask_request.args.get("token")
        if not token:
            logger.warning("Socket connect rejected: no token")
            return False
        if not authenticate_socket(flask_request.sid, token):
            logger.warning("Socket connect rejected: invalid token")
            return False

    @socketio.on("create_room")
    def on_create_room(_data=None):
        sid = flask_request.sid
        player = get_player_for_socket(sid)
        if not player:
            emit("auth_error", {"message": "Not authenticated"})
            return
        room_code = create_room(sid, player.get("player_id"))
        emit("room_created", {"room_code": room_code})

    @socketio.on("join_room")
    def on_join_room(data):
        sid = flask_request.sid
        player = get_player_for_socket(sid)
        if not player:
            emit("auth_error", {"message": "Not authenticated"})
            return
        room_code = (data or {}).get("room_code", "").strip().upper()
        if not room_code:
            emit("room_error", {"message": "room_code required"})
            return
        result = join_room(room_code, sid, player.get("player_id"))
        if result is None:
            emit("room_error", {"message": "Room full or invalid code"})
            return
        emit("room_joined", {"seat": 1, "room_code": result})
        # Notify creator that opponent joined
        if room_code in rooms:
            creator_sid = rooms[room_code].creator_sid
            emit("opponent_joined", {}, room=creator_sid)
        # Start match and send match_start + game_state_update to both
        session = start_match(room_code)
        if not session or not session.manager:
            emit("room_error", {"message": "Could not start match"})
            return
        manager = session.manager
        sid0, sid1 = session.sockets[0], session.sockets[1]
        emit("match_start", {"small_blind": 0.5, "big_blind": 1.0}, room=sid0)
        emit("match_start", {"small_blind": 0.5, "big_blind": 1.0}, room=sid1)
        state0 = manager.get_state_dict_for_seat(0)
        state1 = manager.get_state_dict_for_seat(1)
        emit("game_state_update", state0, room=sid0)
        emit("game_state_update", state1, room=sid1)

    @socketio.on("player_action")
    def on_player_action(data):
        sid = flask_request.sid
        if not get_player_for_socket(sid):
            emit("auth_error", {"message": "Not authenticated"})
            return
        data = data or {}
        action = (data.get("action") or "").strip().lower()
        amount = data.get("amount")

        match_session = get_match_for_socket(sid)
        if not match_session:
            emit("action_rejected", {"message": "Not in a match"})
            return
        manager = match_session.manager
        if not manager or not manager.state:
            emit("action_rejected", {"message": "No active hand"})
            return
        if manager.state.is_terminal():
            emit("action_rejected", {"message": "Hand is over"})
            return

        seat = match_session.seat_for(sid)
        if seat is None:
            emit("action_rejected", {"message": "Unknown seat"})
            return
        if manager.state.current_player != seat:
            emit("action_rejected", {"message": "Not your turn"})
            return

        if action == "raise" and amount is not None:
            action_str = f"Raise({amount})"
        elif action in ("fold", "check", "call"):
            action_str = action.capitalize()
        else:
            emit("action_rejected", {"message": f"Invalid action: {action}"})
            return

        parsed = _parse_action_string_static(action_str)
        if parsed is None or parsed not in manager.state.legal_actions():
            emit("action_rejected", {"message": "Illegal action"})
            return

        manager.process_action(seat, action_str)
        emit("action_ack", {"ok": True})

        state0 = manager.get_state_dict_for_seat(0)
        state1 = manager.get_state_dict_for_seat(1)
        emit("game_state_update", state0, room=match_session.sockets[0])
        emit("game_state_update", state1, room=match_session.sockets[1])

        # If hand just ended (showdown), start next hand after delay and emit again
        # Use socketio.emit() in the timer callback (no request context in background thread)
        if state0.get("hand_over") and manager.state and manager.state.is_terminal():
            room_code = match_session.room_code
            sockets = list(match_session.sockets)

            def _emit_next_hand():
                if room_code not in matches:
                    return
                sess = matches[room_code]
                if not sess.manager:
                    return
                mgr = sess.manager
                mgr.start_next_hand()
                sess.hands_played += 1
                s0 = mgr.get_state_dict_for_seat(0)
                s1 = mgr.get_state_dict_for_seat(1)
                socketio.emit("game_state_update", s0, room=sockets[0])
                socketio.emit("game_state_update", s1, room=sockets[1])

            t = threading.Timer(SHOWDOWN_DELAY_SECONDS, _emit_next_hand)
            t.daemon = True
            t.start()

    @socketio.on("reconnect_sync")
    def on_reconnect_sync(data):
        """Client reconnected; send full state if still in match."""
        sid = flask_request.sid
        if not get_player_for_socket(sid):
            emit("auth_error", {"message": "Not authenticated"})
            return
        room_code = (data or {}).get("room_code", "").strip().upper()
        if not room_code or room_code not in matches:
            emit("game_state_update", {"waiting_for_opponent": True, "seat": None})
            return
        session = matches[room_code]
        if sid not in session.seat_for_socket:
            emit("game_state_update", {"waiting_for_opponent": True, "seat": None})
            return
        seat = session.seat_for(sid)
        if session.manager:
            state = session.manager.get_state_dict_for_seat(seat)
            emit("game_state_update", state)

    def _record_match_stats(room_code: str, other_sid: str):
        """Record match stats before room is removed (winner = remaining player)."""
        if room_code not in matches:
            return
        session = matches[room_code]
        if not session.player1_id or not session.player2_id:
            return
        winner_seat = session.seat_for(other_sid)
        bb_result_player1 = 0.0
        if session.manager and session.manager.state:
            stacks = session.manager.state.stacks
            # Starting stack 100, big blind 1.0
            bb_result_player1 = (float(stacks[0]) - 100.0) / 1.0
        update_player_stats_after_match(
            session.player1_id,
            session.player2_id,
            winner_seat,
            session.hands_played,
            bb_result_player1,
        )

    @socketio.on("disconnect")
    def on_disconnect():
        sid = flask_request.sid
        clear_socket(sid)
        match_session = get_match_for_socket(sid)
        if match_session:
            other = match_session.other_socket(sid)
            socket_to_room.pop(sid, None)
            if other:
                schedule_match_end(
                    match_session.room_code,
                    emit,
                    other,
                    on_before_remove=lambda rc=match_session.room_code, o=other: _record_match_stats(rc, o),
                )
            else:
                remove_room_and_match(match_session.room_code)
            return
        for code, room in list(rooms.items()):
            if room.creator_sid == sid or room.joiner_sid == sid:
                socket_to_room.pop(sid, None)
                remove_room_and_match(code)
                break
