"""Socket layer: auth and session mapping."""

from poker_web.backend.sockets.auth import (
    authenticate_socket,
    get_player_for_socket,
    clear_socket,
)

__all__ = ["authenticate_socket", "get_player_for_socket", "clear_socket"]
