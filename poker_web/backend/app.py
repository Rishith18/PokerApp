"""Flask application for poker web interface.

This is the main entry point for the poker web server.
It serves the frontend static files, REST API, and WebSocket (SocketIO) for multiplayer.
"""

import os
import sys
import logging
from pathlib import Path

# Load .env from backend directory so DATABASE_URL and JWT_SECRET are set
_backend_dir = Path(__file__).resolve().parent
_load_env = _backend_dir / ".env"
if _load_env.exists():
    try:
        from dotenv import load_dotenv
        load_dotenv(_load_env)
    except ImportError:
        pass  # python-dotenv not installed; rely on env vars from shell

# Eventlet must be monkey-patched before importing Flask/SocketIO to avoid
# "write() before start_response" when handling WebSocket upgrades.
_async_mode = "threading"
try:
    import eventlet
    eventlet.monkey_patch()
    _async_mode = "eventlet"
except ImportError:
    pass  # fall back to threading if eventlet not installed

from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from poker_web.backend.limiter import limiter

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create Flask app; bind limiter after app exists to avoid circular imports
app = Flask(__name__)
CORS(app, origins='*', supports_credentials=True)
limiter.init_app(app)
# Prefer eventlet for WebSocket support; avoids Werkzeug "write() before start_response" on upgrade
socketio = SocketIO(app, cors_allowed_origins='*', async_mode=_async_mode)

from poker_web.backend.routes import init_routes
from poker_web.backend.socket_events import register_socket_events
from poker_web.backend.auth.routes import auth_bp
from poker_web.backend.player.routes import api_player

# Configuration
app.config['SECRET_KEY'] = 'poker-dev-secret-key-change-in-production'
app.config['JSON_SORT_KEYS'] = False

# Paths
STRATEGY_PATH = project_root / 'strategy_ext.pkl'


@app.route('/')
def index():
    """API health check endpoint."""
    return {
        'status': 'ok',
        'message': 'Poker API Server is running',
        'note': 'Frontend runs on http://localhost:3000'
    }


def main():
    """Run the Flask server with SocketIO."""
    if not STRATEGY_PATH.exists():
        logger.error(f"Strategy file not found: {STRATEGY_PATH}")
        logger.error("Please ensure strategy_ext.pkl exists in the project root.")
        sys.exit(1)

    app.register_blueprint(auth_bp)
    app.register_blueprint(api_player)
    init_routes(app, str(STRATEGY_PATH))
    register_socket_events(socketio)

    logger.info("=" * 60)
    logger.info("Starting Poker API Server (Flask + SocketIO)")
    logger.info(f"Strategy file: {STRATEGY_PATH}")
    logger.info("=" * 60)
    logger.info("\nAPI + WebSocket at: http://localhost:8080")
    logger.info("Frontend: cd poker_web/frontend && pnpm dev -> http://localhost:3000\n")

    socketio.run(app, host='0.0.0.0', port=8080, debug=True, allow_unsafe_werkzeug=True)


if __name__ == '__main__':
    main()
