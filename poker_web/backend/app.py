"""Flask application for poker web interface.

This is the main entry point for the poker web server.
It serves the frontend static files and provides REST API endpoints.
"""

import os
import sys
import logging
from pathlib import Path

from flask import Flask, send_from_directory, send_file
from flask_cors import CORS

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from poker_web.backend.routes import init_routes

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
app.config['SECRET_KEY'] = 'poker-dev-secret-key-change-in-production'
app.config['JSON_SORT_KEYS'] = False

# Paths
STRATEGY_PATH = project_root / 'strategy_ext.pkl'


# Health check endpoint (root)
@app.route('/')
def index():
    """API health check endpoint."""
    return {
        'status': 'ok',
        'message': 'Poker API Server is running',
        'note': 'Frontend runs on http://localhost:3000'
    }


def main():
    """Run the Flask development server."""
    # Check if strategy file exists
    if not STRATEGY_PATH.exists():
        logger.error(f"Strategy file not found: {STRATEGY_PATH}")
        logger.error("Please ensure strategy_ext.pkl exists in the project root.")
        sys.exit(1)

    # Initialize routes with game manager
    init_routes(app, str(STRATEGY_PATH))

    logger.info("=" * 60)
    logger.info("Starting Poker API Server")
    logger.info(f"Strategy file: {STRATEGY_PATH}")
    logger.info("=" * 60)
    logger.info("\nAPI Server running at: http://localhost:8080")
    logger.info("Frontend (Next.js): Start with 'cd poker_web/frontend && pnpm dev'")
    logger.info("Then open: http://localhost:3000\n")

    # Run Flask development server
    app.run(
        host='0.0.0.0',
        port=8080,
        debug=True,
        use_reloader=True
    )


if __name__ == '__main__':
    main()
