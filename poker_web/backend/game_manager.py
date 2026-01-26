"""Game manager for poker web interface.

This module manages the game state and integrates with the existing poker bot.
It provides a JSON-serializable interface for the web frontend.
"""

from __future__ import annotations

import logging
import os
import sys
from typing import Dict, List, Optional, Any, Tuple

# Add parent directory to path to import poker_bot
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../..'))

from poker_bot.bot.poker_bot import PokerBot
from poker_bot.game_engine.game import PokerGame
from poker_bot.game_engine.actions import Action, ActionType
from poker_bot.game_engine.state import GameState
from poker_bot.utils.helpers import action_token_for_history, action_to_str

logger = logging.getLogger(__name__)


def card_to_string(card) -> str:
    """Convert a Card object to string format (e.g., 'As', 'Kh', '2c')."""
    if card is None:
        return ""
    # Card has rank and suit attributes
    rank_map = {
        14: 'A', 13: 'K', 12: 'Q', 11: 'J',
        10: 'T', 9: '9', 8: '8', 7: '7',
        6: '6', 5: '5', 4: '4', 3: '3', 2: '2'
    }
    suit_map = {'s': 's', 'h': 'h', 'd': 'd', 'c': 'c'}

    # Handle different card representations
    if hasattr(card, 'rank') and hasattr(card, 'suit'):
        rank_str = rank_map.get(card.rank, str(card.rank))
        suit_str = suit_map.get(card.suit.lower(), card.suit.lower())
        return f"{rank_str}{suit_str}"
    else:
        # Already a string or other format
        return str(card)


class GameManager:
    """Manages poker game state and bot interactions.

    This class provides a bridge between the web frontend and the poker bot backend.
    It maintains game state, processes player actions, and returns JSON-serializable
    game state dictionaries.

    Attributes:
        game: PokerGame instance
        bot: PokerBot loaded from strategy file
        state: Current GameState
        history: Action history string for bot decision making
        button: Current button position (0 or 1)
        human_player: Human player index (always 1)
        bot_player: Bot player index (always 0)
        wins: Win counts for [bot, human]
        hands_played: Total hands played
    """

    def __init__(self, strategy_path: str = 'strategy_ext.pkl'):
        """Initialize game manager.

        Args:
            strategy_path: Path to trained strategy pickle file
        """
        # Load bot with trained strategy
        if not os.path.exists(strategy_path):
            raise FileNotFoundError(f"Strategy file not found: {strategy_path}")

        self.bot = PokerBot.from_pickle(strategy_path)
        logger.info(f"Loaded bot from {strategy_path}")

        # Initialize game
        self.game = PokerGame(
            small_blind=0.5,
            big_blind=1.0,
            starting_stack=100.0,
            max_street=self.bot.max_street,
            bet_size_mults=self.bot.bet_size_mults,
        )

        # Game state
        self.state: Optional[GameState] = None
        self.history: str = ""
        self.button: int = 0

        # Player indices (human is always player 1, bot is player 0)
        self.human_player = 1
        self.bot_player = 0

        # Statistics
        self.wins = [0, 0]  # [bot_wins, human_wins]
        self.hands_played = 0

    def start_new_hand(self) -> Dict[str, Any]:
        """Start a new hand and return initial game state.

        Returns:
            Dictionary with game state information
        """
        # Start new hand
        self.state = self.game.start_hand(self.button)
        self.history = ""
        self.hands_played += 1

        logger.info(f"Starting hand #{self.hands_played}, button: {self.button}")

        # Return initial state
        return self.get_state_dict()

    def get_state_dict(self, reveal_bot_cards: bool = False) -> Dict[str, Any]:
        """Convert current game state to JSON-serializable dictionary.

        Args:
            reveal_bot_cards: Whether to reveal bot's hole cards (for showdown)

        Returns:
            Dictionary containing:
            - pot: Current pot size
            - stacks: {player: stack, bot: stack}
            - round: Current betting round (preflop, flop, turn, river)
            - board: List of community card strings
            - player_cards: List of player's hole card strings
            - bot_cards: List of bot's cards (null if hidden)
            - legal_actions: List of legal action strings
            - last_action: {actor: str, action: str, amount: float} or null
            - winner: 'player' | 'bot' | 'split' | null
            - hand_over: Boolean
            - wins: {player: count, bot: count}
            - current_player: 'player' | 'bot'
            - can_act: Boolean (true if it's player's turn)
        """
        if self.state is None:
            return {
                'pot': 0.0,
                'stacks': {'player': 100.0, 'bot': 100.0},
                'round': 'preflop',
                'board': [],
                'player_cards': [],
                'bot_cards': None,
                'legal_actions': [],
                'last_action': None,
                'winner': None,
                'hand_over': True,
                'wins': {'player': self.wins[1], 'bot': self.wins[0]},
                'current_player': None,
                'can_act': False,
            }

        # Get pot (includes current round bets)
        pot = self.state.pot + sum(self.state.round_bets)

        # Get stacks
        stacks = {
            'player': float(self.state.stacks[self.human_player]),
            'bot': float(self.state.stacks[self.bot_player]),
        }

        # Get board cards
        board = [card_to_string(c) for c in self.state.board]

        # Get player hole cards
        player_cards = [card_to_string(c) for c in (self.state.hole_cards[self.human_player] or [])]

        # Get bot hole cards (hidden unless showdown or reveal_bot_cards)
        bot_cards = None
        if reveal_bot_cards or self.state.is_showdown():
            bot_cards = [card_to_string(c) for c in (self.state.hole_cards[self.bot_player] or [])]

        # Get legal actions
        legal_actions = []
        if not self.state.is_terminal():
            for action in self.state.legal_actions():
                legal_actions.append(action_to_str(action))

        # Determine current player
        current_player = None
        can_act = False
        if not self.state.is_terminal():
            if self.state.current_player == self.human_player:
                current_player = 'player'
                can_act = True
            else:
                current_player = 'bot'

        # Get last action (from round history)
        last_action = None
        if self.state.round_history:
            last_act = self.state.round_history[-1]
            actor = 'player' if last_act[0] == self.human_player else 'bot'
            action_str = action_to_str(last_act[1])
            amount = last_act[1].amount if last_act[1].amount is not None else None
            last_action = {
                'actor': actor,
                'action': action_str,
                'amount': amount,
            }

        # Determine winner
        winner = None
        if self.state.is_terminal():
            if self.state.folded is not None:
                winner = 'player' if self.state.folded == self.bot_player else 'bot'
            elif self.state.winner is not None:
                if self.state.winner == self.human_player:
                    winner = 'player'
                elif self.state.winner == self.bot_player:
                    winner = 'bot'
                else:
                    winner = 'split'

        return {
            'pot': float(pot),
            'stacks': stacks,
            'round': self.state.round_name,
            'board': board,
            'player_cards': player_cards,
            'bot_cards': bot_cards,
            'legal_actions': legal_actions,
            'last_action': last_action,
            'winner': winner,
            'hand_over': self.state.is_terminal(),
            'wins': {'player': self.wins[1], 'bot': self.wins[0]},
            'current_player': current_player,
            'can_act': can_act,
        }

    def process_player_action(self, action_str: str) -> Dict[str, Any]:
        """Process a player action and get bot response if needed.

        Args:
            action_str: Action string (e.g., 'Fold', 'Check', 'Call', 'Raise(5.0)')

        Returns:
            Updated game state dictionary
        """
        if self.state is None or self.state.is_terminal():
            return self.get_state_dict()

        # Parse action string
        action = self._parse_action_string(action_str)
        if action is None:
            logger.error(f"Invalid action string: {action_str}")
            return self.get_state_dict()

        # Validate it's player's turn
        if self.state.current_player != self.human_player:
            logger.error("Not player's turn")
            return self.get_state_dict()

        # Apply player action
        logger.info(f"Player action: {action_str}")
        self.history += action_token_for_history(self.state, action)
        self.state = self.game.step(self.state, action)

        # Check if hand is over
        if self.state.is_terminal():
            return self._handle_hand_end()

        # Bot's turn - process bot actions until it's player's turn or hand ends
        return self._process_bot_actions()

    def _process_bot_actions(self) -> Dict[str, Any]:
        """Process bot actions until it's player's turn or hand ends.

        Returns:
            Updated game state dictionary
        """
        while not self.state.is_terminal() and self.state.current_player == self.bot_player:
            # Get bot action
            legal_actions = self.state.legal_actions()
            if not legal_actions:
                break

            bot_action = self.bot.get_action(self.state, self.history, sample=True)
            if bot_action is None:
                bot_action = legal_actions[0]

            logger.info(f"Bot action: {action_to_str(bot_action)}")

            # Apply bot action
            self.history += action_token_for_history(self.state, bot_action)
            self.state = self.game.step(self.state, bot_action)

            # Check if hand is over
            if self.state.is_terminal():
                return self._handle_hand_end()

        return self.get_state_dict()

    def _handle_hand_end(self) -> Dict[str, Any]:
        """Handle end of hand, update statistics, return final state.

        Returns:
            Final game state dictionary with revealed cards
        """
        # Update win statistics
        if self.state.winner is not None:
            if not (self.state.folded is not None):
                # Showdown - winner determined by hand strength
                self.wins[self.state.winner] += 1
            else:
                # Fold - winner is the non-folding player
                winner_idx = 1 - self.state.folded
                self.wins[winner_idx] += 1

        logger.info(f"Hand over. Winner: {self.state.winner}. Wins: Bot={self.wins[0]}, Human={self.wins[1]}")

        # Prepare for next hand (alternate button)
        self.button = 1 - self.button

        # Return state with bot cards revealed
        return self.get_state_dict(reveal_bot_cards=True)

    def _parse_action_string(self, action_str: str) -> Optional[Action]:
        """Parse action string to Action object.

        Args:
            action_str: String like 'Fold', 'Check', 'Call', 'Raise(5.0)'

        Returns:
            Action object or None if invalid
        """
        action_str = action_str.strip().lower()

        if action_str == 'fold':
            return Action(ActionType.FOLD)
        elif action_str == 'check':
            return Action(ActionType.CHECK)
        elif action_str == 'call':
            return Action(ActionType.CALL)
        elif action_str.startswith('raise'):
            # Extract amount from 'raise(X)' or 'raise X'
            try:
                if '(' in action_str:
                    amount_str = action_str.split('(')[1].split(')')[0]
                else:
                    amount_str = action_str.split()[1]
                amount = float(amount_str)
                return Action(ActionType.RAISE, amount=amount)
            except (IndexError, ValueError):
                return None

        return None

    def get_current_state(self) -> Dict[str, Any]:
        """Get current game state without processing any actions.

        Returns:
            Current game state dictionary
        """
        return self.get_state_dict()
