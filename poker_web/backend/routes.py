"""API routes for poker web interface.

This module defines all the REST API endpoints for the poker game.
"""

from flask import Blueprint, jsonify, request
import logging

from poker_web.backend.game_manager import GameManager

logger = logging.getLogger(__name__)

# Create blueprint
api = Blueprint('api', __name__, url_prefix='/api')

# Global game manager instance (in production, use sessions)
game_manager = None


def init_routes(app, strategy_path: str = 'strategy_ext.pkl'):
    """Initialize routes with game manager.

    Args:
        app: Flask app instance
        strategy_path: Path to strategy file
    """
    global game_manager
    game_manager = GameManager(strategy_path=strategy_path)
    app.register_blueprint(api)
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
