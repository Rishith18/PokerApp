"""API routes for poker web interface.

This module defines all the REST API endpoints for the poker game.
"""

import logging
import secrets
from typing import Dict, Any

from flask import Blueprint, jsonify, request

from poker_web.backend.game_manager import GameManager, MultiplayerGameManager

logger = logging.getLogger(__name__)

# Create blueprint
api = Blueprint('api', __name__, url_prefix='/api')

# Global game manager instance (in production, use sessions)
game_manager = None

# Multiplayer (REST) in-memory store: game_token -> { "manager": MultiplayerGameManager, "seats": [0] or [0,1] }
mp_games: Dict[str, Dict[str, Any]] = {}


def _mp_game_token() -> str:
    """Generate a short alphanumeric game token."""
    return secrets.token_urlsafe(8).replace("-", "").replace("_", "")[:8].upper()


def init_routes(app, strategy_path: str = 'strategy_ext.pkl'):
    """Initialize routes with game manager.

    Args:
        app: Flask app instance
        strategy_path: Path to strategy file
    """
    global game_manager
    game_manager = GameManager(strategy_path=strategy_path)
    app.register_blueprint(api)
    app.register_blueprint(api_mp)
    logger.info("Routes initialized")


@api.route('/game/new', methods=['POST'])
def new_game():
    """Start a new hand.

    Returns:
        JSON response with initial game state
    """
    try:
        state = game_manager.start_new_hand()

        # If it's bot's turn (bot is small blind), process bot actions
        if not state['can_act'] and not state['hand_over']:
            state = game_manager._process_bot_actions()

        return jsonify(state), 200
    except Exception as e:
        logger.error(f"Error starting new game: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@api.route('/game/action', methods=['POST'])
def player_action():
    """Process player action.

    Request body:
        {
            "action": "call" | "fold" | "check" | "raise",
            "amount": <number>  # Only for raise
        }

    Returns:
        JSON response with updated game state
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        action = data.get('action', '').strip().lower()
        amount = data.get('amount')

        # Build action string
        if action == 'raise' and amount is not None:
            action_str = f"Raise({amount})"
        elif action in ['fold', 'check', 'call']:
            action_str = action.capitalize()
        else:
            return jsonify({'error': f'Invalid action: {action}'}), 400

        # Process action
        state = game_manager.process_player_action(action_str)

        return jsonify(state), 200
    except Exception as e:
        logger.error(f"Error processing action: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@api.route('/game/state', methods=['GET'])
def get_state():
    """Get current game state.

    Returns:
        JSON response with current game state
    """
    try:
        state = game_manager.get_current_state()
        return jsonify(state), 200
    except Exception as e:
        logger.error(f"Error getting state: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500


@api.route('/health', methods=['GET'])
def health():
    """Health check endpoint.

    Returns:
        JSON response indicating server health
    """
    return jsonify({'status': 'ok', 'message': 'Poker server is running'}), 200


# --- Multiplayer REST API (Phase 1: local two-player simulation) ---

api_mp = Blueprint('api_mp', __name__, url_prefix='/api/mp')


@api_mp.route('/game/new', methods=['POST'])
def mp_new_game():
    """Create a new multiplayer game. Creator gets seat 0. Hand starts when second player joins.

    Returns:
        { "game_token": str, "seat": 0 }
    """
    try:
        token = _mp_game_token()
        manager = MultiplayerGameManager()
        mp_games[token] = {"manager": manager, "seats": [0]}
        return jsonify({"game_token": token, "seat": 0}), 200
    except Exception as e:
        logger.error(f"Error creating mp game: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@api_mp.route('/game/join', methods=['POST'])
def mp_join_game():
    """Join an existing game as seat 1. Starts the first hand.

    Request body: { "game_token": str }
    Returns:
        { "seat": 1, "state": <state view for seat 1> }
    """
    try:
        data = request.get_json() or {}
        token = (data.get("game_token") or "").strip().upper()
        if not token:
            return jsonify({"error": "game_token required"}), 400
        if token not in mp_games:
            return jsonify({"error": "Invalid or expired game code"}), 404
        rec = mp_games[token]
        seats = rec["seats"]
        if len(seats) >= 2:
            return jsonify({"error": "Room full"}), 400
        rec["seats"] = [0, 1]
        manager = rec["manager"]
        manager.start_hand(0)
        state = manager.get_state_dict_for_seat(1)
        return jsonify({"seat": 1, "state": state}), 200
    except Exception as e:
        logger.error(f"Error joining mp game: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@api_mp.route('/game/state', methods=['GET'])
def mp_get_state():
    """Get state view for a seat. If hand not started (waiting for opponent), state has waiting_for_opponent.

    Query: game_token, seat (0 or 1)
    """
    try:
        token = (request.args.get("game_token") or "").strip().upper()
        seat = request.args.get("seat")
        if not token:
            return jsonify({"error": "game_token required"}), 400
        try:
            seat = int(seat)
        except (TypeError, ValueError):
            return jsonify({"error": "seat required (0 or 1)"}), 400
        if seat not in (0, 1):
            return jsonify({"error": "seat must be 0 or 1"}), 400
        if token not in mp_games:
            return jsonify({"error": "Invalid or expired game code"}), 404
        manager = mp_games[token]["manager"]
        state = manager.get_state_dict_for_seat(seat)
        return jsonify(state), 200
    except Exception as e:
        logger.error(f"Error getting mp state: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@api_mp.route('/game/action', methods=['POST'])
def mp_player_action():
    """Submit an action for the given seat. Returns updated state view for that seat.

    Request body: { "game_token": str, "seat": 0|1, "action": "fold"|"check"|"call"|"raise", "amount"?: number }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided"}), 400
        token = (data.get("game_token") or "").strip().upper()
        seat = data.get("seat")
        action = (data.get("action") or "").strip().lower()
        amount = data.get("amount")

        if not token:
            return jsonify({"error": "game_token required"}), 400
        try:
            seat = int(seat)
        except (TypeError, ValueError):
            return jsonify({"error": "seat required (0 or 1)"}), 400
        if seat not in (0, 1):
            return jsonify({"error": "seat must be 0 or 1"}), 400
        if token not in mp_games:
            return jsonify({"error": "Invalid or expired game code"}), 404

        if action == "raise" and amount is not None:
            action_str = f"Raise({amount})"
        elif action in ("fold", "check", "call"):
            action_str = action.capitalize()
        else:
            return jsonify({"error": f"Invalid action: {action}"}), 400

        manager = mp_games[token]["manager"]
        state = manager.process_action(seat, action_str)
        return jsonify(state), 200
    except Exception as e:
        logger.error(f"Error processing mp action: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500
