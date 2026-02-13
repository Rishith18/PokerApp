"""WebSocket event handlers for multiplayer poker."""

from __future__ import annotations

import logging
import threading
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

logger = logging.getLogger(__name__)

SHOWDOWN_DELAY_SECONDS = 3


def register_socket_events(socketio):
    """Register all socket event handlers."""

    @socketio.on("create_room")
    def on_create_room(_data=None):
        from flask import request as flask_request
        creator_sid = flask_request.sid
        room_code = create_room(creator_sid)
        emit("room_created", {"room_code": room_code})

    @socketio.on("join_room")
    def on_join_room(data):
        from flask import request as flask_request
        sid = flask_request.sid
        room_code = (data or {}).get("room_code", "").strip().upper()
        if not room_code:
            emit("room_error", {"message": "room_code required"})
            return
        result = join_room(room_code, sid)
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
        from flask import request as flask_request
        sid = flask_request.sid
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
        from flask import request as flask_request
        sid = flask_request.sid
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

    @socketio.on("disconnect")
    def on_disconnect():
        from flask import request as flask_request
        sid = flask_request.sid
        match_session = get_match_for_socket(sid)
        if match_session:
            other = match_session.other_socket(sid)
            socket_to_room.pop(sid, None)
            if other:
                schedule_match_end(match_session.room_code, emit, other)
            else:
                remove_room_and_match(match_session.room_code)
            return
        for code, room in list(rooms.items()):
            if room.creator_sid == sid or room.joiner_sid == sid:
                socket_to_room.pop(sid, None)
                remove_room_and_match(code)
                break
