# Poker Web Interface

A modern, professional web-based interface for playing Heads-Up Texas Hold'em against a trained CFR (Counterfactual Regret Minimization) poker bot.

![Poker Interface](https://img.shields.io/badge/Poker-Texas%20Hold'em-green)
![Python](https://img.shields.io/badge/Python-3.8+-blue)
![Flask](https://img.shields.io/badge/Flask-2.3+-red)

## Features

- **Professional Poker Table UI**: Beautiful green felt table with realistic card animations
- **Real-time Gameplay**: Smooth animations for card dealing, betting, and pot management
- **CFR Bot Integration**: Play against a sophisticated poker AI trained using Counterfactual Regret Minimization
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Interactive Controls**: Multiple betting options including preset pot-based raises
- **Game Statistics**: Track wins, losses, and hand history
- **Keyboard Shortcuts**: Fast gameplay with keyboard controls (F=Fold, C=Call/Check, R=Raise)

## Project Structure

```
poker_web/
├── backend/
│   ├── __init__.py
│   ├── app.py              # Flask server entry point
│   ├── game_manager.py     # Game state management and bot integration
│   └── routes.py           # API endpoints
├── frontend/
│   ├── index.html          # Main HTML page
│   ├── css/
│   │   └── poker.css       # All styling and animations
│   ├── js/
│   │   ├── game.js         # Main game logic and API integration
│   │   ├── animations.js   # Card dealing and chip animations
│   │   └── ui.js           # UI update functions
│   └── assets/
│       ├── cards/          # Card images (uses CSS rendering)
│       └── sounds/         # Sound effects (optional)
├── requirements.txt        # Python dependencies
└── README.md              # This file
```

## Installation

### Prerequisites

- Python 3.8 or higher
- A trained CFR strategy file (`strategy_ext.pkl` in the project root)

### Setup

1. **Install Dependencies**

   ```bash
   # Install web interface dependencies
   cd poker_web
   pip install -r requirements.txt

   # Install existing poker bot dependencies (from project root)
   cd ..
   pip install -r requirements.txt
   ```

2. **Verify Strategy File**

   Ensure the trained strategy file exists at:
   ```
   /path/to/PokerApp/strategy_ext.pkl
   ```

   If you don't have a trained strategy, run the CFR training first:
   ```bash
   python main.py
   ```

## Running the Application

1. **Start the Server**

   From the project root directory:
   ```bash
   python poker_web/backend/app.py
   ```

   Or from within the poker_web directory:
   ```bash
   python backend/app.py
   ```

2. **Access the Interface**

   Open your web browser and navigate to:
   ```
   http://localhost:5000
   ```

3. **Start Playing!**

   Click "New Hand" to begin a game against the bot.

## How to Play

### Game Controls

- **Fold**: Give up your hand and forfeit the pot
- **Check**: Pass the action without betting (only available when there's no bet to call)
- **Call**: Match the current bet
- **Raise**: Increase the bet
  - Use preset buttons: ½ Pot, ¾ Pot, Pot, All-In
  - Or enter a custom amount

### Keyboard Shortcuts

- `F` - Fold
- `C` - Check/Call
- `R` - Focus on raise amount input
- `Enter` - Confirm raise amount

### Game Flow

1. Each hand starts with blinds posted (small blind: 0.5, big blind: 1.0)
2. You and the bot are dealt 2 hole cards each
3. Betting rounds proceed: Preflop → Flop → Turn → River
4. Community cards are revealed progressively
5. Best 5-card hand wins at showdown

## API Endpoints

The backend provides the following REST API endpoints:

### `POST /api/game/new`
Start a new hand.

**Response:**
```json
{
  "pot": 1.5,
  "stacks": {"player": 99.5, "bot": 99.5},
  "round": "preflop",
  "board": [],
  "player_cards": ["As", "Kh"],
  "bot_cards": null,
  "legal_actions": ["Fold", "Call (1.0)", "Raise(3.5)", ...],
  "last_action": null,
  "winner": null,
  "hand_over": false,
  "wins": {"player": 0, "bot": 0},
  "current_player": "player",
  "can_act": true
}
```

### `POST /api/game/action`
Process a player action.

**Request:**
```json
{
  "action": "call"
}
```
or for raises:
```json
{
  "action": "raise",
  "amount": 5.0
}
```

**Response:** Same format as `/api/game/new`

### `GET /api/game/state`
Get current game state without taking action.

**Response:** Same format as `/api/game/new`

### `GET /api/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "Poker server is running"
}
```

## Game State

The game state returned by the API includes:

- `pot`: Current pot size (float)
- `stacks`: Player and bot stack sizes (dict)
- `round`: Current betting round - "preflop", "flop", "turn", "river", or "terminal"
- `board`: Community cards (array of strings like ["As", "Kh", "2c"])
- `player_cards`: Your hole cards (array)
- `bot_cards`: Bot's hole cards (null until showdown)
- `legal_actions`: Available actions (array of strings)
- `last_action`: Most recent action taken (object or null)
- `winner`: "player", "bot", "split", or null
- `hand_over`: Boolean indicating if hand is complete
- `wins`: Win counts for player and bot
- `current_player`: "player" or "bot"
- `can_act`: Boolean indicating if player can act

## Card Notation

Cards are represented as two-character strings:
- First character: Rank (2-9, T, J, Q, K, A)
- Second character: Suit (s=spades, h=hearts, d=diamonds, c=clubs)

Examples: `"As"` (Ace of Spades), `"Kh"` (King of Hearts), `"2c"` (Two of Clubs)

## Customization

### Styling

Edit `frontend/css/poker.css` to customize:
- Colors (see CSS variables at top of file)
- Table size and shape
- Card appearance
- Button styles
- Animations

### Game Settings

Edit `backend/game_manager.py` to change:
- Stack sizes (default: 100 BB)
- Blind levels (default: SB=0.5, BB=1.0)
- Betting round limits (controlled by strategy file)

### Bot Behavior

The bot's strategy is loaded from the pickle file. To change bot behavior:
1. Modify CFR training parameters in `main.py`
2. Retrain the bot
3. Replace `strategy_ext.pkl`
4. Restart the server

## Troubleshooting

### Server won't start

**Problem:** `FileNotFoundError: Strategy file not found`

**Solution:** Ensure `strategy_ext.pkl` exists in the project root. Run training:
```bash
python main.py
```

### Cards not displaying

**Problem:** Cards show as placeholders or blank

**Solution:** Check browser console for JavaScript errors. Ensure all JS files are loaded correctly.

### API errors

**Problem:** "Error processing action" alerts

**Solution:**
1. Check server logs for detailed error messages
2. Verify the action is legal according to `legal_actions`
3. Ensure server is running and accessible at `localhost:5000`

### Animation issues

**Problem:** Animations choppy or not working

**Solution:**
1. Try a modern browser (Chrome, Firefox, Safari)
2. Check browser console for errors
3. Disable browser extensions that might interfere

## Development

### Adding New Features

1. **Backend changes**: Edit `game_manager.py` and `routes.py`
2. **Frontend logic**: Edit `js/game.js`
3. **UI components**: Edit `js/ui.js` and `index.html`
4. **Animations**: Edit `js/animations.js`
5. **Styling**: Edit `css/poker.css`

### Testing

Test the API directly using curl:

```bash
# Start new hand
curl -X POST http://localhost:5000/api/game/new

# Take action
curl -X POST http://localhost:5000/api/game/action \
  -H "Content-Type: application/json" \
  -d '{"action": "call"}'

# Get state
curl http://localhost:5000/api/game/state
```

### Debugging

Enable Flask debug mode in `app.py`:
```python
app.run(debug=True)
```

Check browser console (F12) for JavaScript errors.

Check server terminal for Python errors and logs.

## Architecture

### Backend (Python/Flask)

- **app.py**: Flask application setup, static file serving, CORS configuration
- **game_manager.py**:
  - Integrates with existing `PokerBot` and `PokerGame` classes
  - Manages game state and history
  - Converts game state to JSON-serializable format
  - Processes player actions and bot responses
- **routes.py**: REST API endpoints for game actions

### Frontend (HTML/CSS/JavaScript)

- **index.html**: Page structure with poker table layout
- **poker.css**: Professional poker table styling with animations
- **game.js**:
  - Main game controller
  - API communication
  - Event handling
  - Game flow management
- **ui.js**:
  - UI update functions
  - Card rendering
  - Button state management
- **animations.js**:
  - Card dealing animations
  - Chip movement animations
  - Transition effects

### Data Flow

1. User clicks action button
2. `game.js` sends API request to backend
3. `routes.py` receives request
4. `game_manager.py` processes action using `PokerBot`
5. Backend returns updated game state
6. `game.js` updates UI via `ui.js` and `animations.js`
7. Visual feedback displayed to user

## Performance

- Typical API response time: < 100ms
- Card animation duration: 300-500ms
- Smooth 60fps animations on modern browsers
- Low memory footprint (~50MB for backend)

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Future Enhancements

Potential improvements for future versions:

- [ ] Sound effects (card shuffle, chip clinks, winner fanfare)
- [ ] Hand strength calculator/display
- [ ] Detailed hand history log
- [ ] Multi-table support
- [ ] Tournament mode
- [ ] Player statistics (VPIP, aggression, etc.)
- [ ] Hand replay feature
- [ ] Customizable table themes
- [ ] Mobile app version
- [ ] Multiplayer support

## License

This project is part of the PokerApp repository. See main project LICENSE for details.

## Credits

Built with:
- [Flask](https://flask.palletsprojects.com/) - Web framework
- [PokerKit](https://github.com/AussieSeaweed/pokerkit) - Poker game engine
- Vanilla JavaScript - No frameworks for lightweight performance
- CSS3 - Modern styling and animations

## Support

For issues, questions, or contributions, please refer to the main PokerApp repository.

---

**Enjoy playing poker against the CFR bot!** 🃏♠️♥️♦️♣️
