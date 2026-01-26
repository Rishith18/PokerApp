"""GameState class tracking all game information."""

from __future__ import annotations

import copy
import logging
from dataclasses import dataclass, field
from typing import List, Optional, Tuple

from poker_bot.game_engine.actions import Action, ActionType, get_legal_actions
from poker_bot.game_engine.card import Card

logger = logging.getLogger(__name__)

DEFAULT_BET_SIZE_MULTS: Tuple[float, ...] = (0.25, 0.5, 0.75, 1.0, 2.0, -1)  # -1 = all-in


@dataclass
class GameState:
    """
    Immutable-ish game state for heads-up NLHE.
    Tracks positions, hole cards, board, pot, stacks, round, history.
    """

    # Config
    small_blind: float
    big_blind: float
    starting_stack: float

    # Positions: 0 = button, 1 = big blind
    button: int  # 0 or 1
    current_player: int  # 0 or 1

    # Cards (None until dealt)
    hole_cards: Tuple[Optional[List[Card]], Optional[List[Card]]]
    board: List[Card] = field(default_factory=list)

    # Money
    stacks: Tuple[float, float] = (0.0, 0.0)
    pot: float = 0.0
    # Current round bets (total put in this round by each player)
    round_bets: Tuple[float, float] = (0.0, 0.0)

    # Round: "preflop" | "flop" | "turn" | "river" | "showdown" | "terminal"
    round_name: str = "preflop"

    # History this round: (player, Action)
    round_history: List[Tuple[int, Action]] = field(default_factory=list)

    # Terminal state
    folded: Optional[int] = None  # player who folded, if any
    winner: Optional[int] = None  # set at showdown

    # Bet abstraction (single source of truth)
    bet_size_mults: Tuple[float, ...] = DEFAULT_BET_SIZE_MULTS

    def __post_init__(self) -> None:
        if self.stacks == (0.0, 0.0):
            object.__setattr__(
                self, "stacks", (self.starting_stack, self.starting_stack)
            )

    def copy(self) -> "GameState":
        return copy.deepcopy(self)

    @property
    def opponent(self) -> int:
        return 1 - self.current_player

    @property
    def can_check(self) -> bool:
        return self.round_bets[self.current_player] >= max(self.round_bets)

    @property
    def call_amount(self) -> float:
        """Amount needed to call (extra to put in this round)."""
        other_bet = self.round_bets[self.opponent]
        my_bet = self.round_bets[self.current_player]
        return max(0, other_bet - my_bet)

    @property
    def min_raise_total(self) -> float:
        """Minimum total bet this round to raise (big blind or geometric)."""
        other = self.round_bets[self.opponent]
        last_raise = self.big_blind
        for _, a in reversed(self.round_history):
            if a.action_type == ActionType.RAISE and a.amount is not None:
                last_raise = max(last_raise, a.amount - other)
                break
        return other + last_raise

    @property
    def max_raise_total(self) -> float:
        """Max total bet = current round bet + remaining stack."""
        return self.round_bets[self.current_player] + self.stacks[self.current_player]

    def legal_actions(self) -> List[Action]:
        if self.folded is not None or self.winner is not None:
            return []
        pot = self.pot + sum(self.round_bets)
        my_bet = self.round_bets[self.current_player]
        call = self.call_amount
        min_total = self.min_raise_total
        max_total = self.max_raise_total
        return get_legal_actions(
            can_check=self.can_check,
            call_amount=call,
            my_current_bet=my_bet,
            min_raise_total=min_total,
            max_raise_total=max_total,
            pot=pot,
            bet_size_mults=list(self.bet_size_mults),
        )

    def apply_action(self, action: Action) -> "GameState":
        """Return new state after applying action."""
        s = self.copy()
        if action.action_type == ActionType.FOLD:
            object.__setattr__(s, "folded", s.current_player)
            object.__setattr__(s, "winner", 1 - s.current_player)
            object.__setattr__(s, "round_name", "terminal")
            return s
        if action.action_type == ActionType.CHECK:
            object.__setattr__(s, "round_history", s.round_history + [(s.current_player, action)])
            object.__setattr__(s, "current_player", s.opponent)
            hist = s.round_history
            if len(hist) >= 2 and hist[-1][1].action_type == ActionType.CHECK and hist[-2][1].action_type == ActionType.CHECK:
                s = s._advance_street(s)
            return s
        if action.action_type == ActionType.CALL:
            add = s.call_amount
            new_bets = list(s.round_bets)
            new_bets[s.current_player] += add
            new_stacks = list(s.stacks)
            new_stacks[s.current_player] -= add
            object.__setattr__(s, "round_bets", tuple(new_bets))
            object.__setattr__(s, "stacks", tuple(new_stacks))
            object.__setattr__(s, "round_history", s.round_history + [(s.current_player, action)])
            object.__setattr__(s, "current_player", s.opponent)
            if new_bets[0] == new_bets[1]:
                s = s._advance_street(s)
            return s
        if action.action_type == ActionType.RAISE and action.amount is not None:
            total_bet = action.amount
            add = total_bet - s.round_bets[s.current_player]
            new_bets = list(s.round_bets)
            new_bets[s.current_player] = total_bet
            new_stacks = list(s.stacks)
            new_stacks[s.current_player] -= add
            object.__setattr__(s, "round_bets", tuple(new_bets))
            object.__setattr__(s, "stacks", tuple(new_stacks))
            object.__setattr__(s, "round_history", s.round_history + [(s.current_player, action)])
            object.__setattr__(s, "current_player", s.opponent)
            return s
        return s

    def _advance_street(self, s: "GameState") -> "GameState":
        """Move to next street; add pot from round bets; reset round bets."""
        pot_add = sum(s.round_bets)
        object.__setattr__(s, "pot", s.pot + pot_add)
        object.__setattr__(s, "round_bets", (0.0, 0.0))
        object.__setattr__(s, "round_history", [])
        next_round = {"preflop": "flop", "flop": "turn", "turn": "river", "river": "showdown"}.get(
            s.round_name, "showdown"
        )
        object.__setattr__(s, "round_name", next_round)
        return s

    @property
    def total_pot(self) -> float:
        """Pot including current round bets (for payouts)."""
        return self.pot + sum(self.round_bets)

    def is_terminal(self) -> bool:
        return self.round_name == "terminal" or self.folded is not None or (
            self.round_name == "showdown" and self.winner is not None
        )

    def is_showdown(self) -> bool:
        return self.round_name == "showdown" and self.folded is None

    def with_board(self, board: List[Card]) -> "GameState":
        """Return a copy with board set (used when dealing flop/turn/river)."""
        s = self.copy()
        object.__setattr__(s, "board", list(board))
        return s
