"""Main game loop and rules engine for heads-up NLHE."""

from __future__ import annotations

import logging
from typing import Callable, List, Optional, Sequence, Tuple

from poker_bot.game_engine.actions import Action
from poker_bot.game_engine.card import Card, Deck
from poker_bot.game_engine.evaluator import HandEvaluator
from poker_bot.game_engine.state import GameState

logger = logging.getLogger(__name__)


class PokerGame:
    """
    Heads-up no-limit Texas Hold'em game.
    Deals hands, runs betting rounds, resolves showdown.
    """

    def __init__(
        self,
        small_blind: float = 0.5,
        big_blind: float = 1.0,
        starting_stack: float = 100.0,
        seed: Optional[int] = None,
        max_street: str = "flop",
        bet_size_mults: Sequence[float] = (0.5, 1.0, -1),
    ) -> None:
        self.small_blind = small_blind
        self.big_blind = big_blind
        self.starting_stack = starting_stack
        self.max_street = max_street  # "flop" | "turn" | "river" for V1
        self.bet_size_mults = tuple(bet_size_mults)
        self._deck = Deck()
        self._evaluator = HandEvaluator()
        if seed is not None:
            import random
            random.seed(seed)

    def _post_blinds(self, stacks: Tuple[float, float], button: int) -> Tuple[Tuple[float, float], float, Tuple[float, float]]:
        """Deduct blinds, return (stacks, pot, round_bets)."""
        sb, bb = self.small_blind, self.big_blind
        s0, s1 = stacks
        if button == 0:
            r0, r1 = sb, bb
            s0 -= sb
            s1 -= bb
        else:
            r0, r1 = bb, sb
            s0 -= bb
            s1 -= sb
        return (s0, s1), sb + bb, (r0, r1)

    def start_hand(self, button: int = 0) -> GameState:
        """
        Start a new hand. Post blinds, deal hole cards.
        Button acts first preflop.
        """
        self._deck.reset()
        self._deck.shuffle()
        stacks = (self.starting_stack, self.starting_stack)
        (s0, s1), pot, round_bets = self._post_blinds(stacks, button)
        hole0 = self._deck.deal(2)
        hole1 = self._deck.deal(2)
        return self._make_state(button, hole0, hole1, (s0, s1), pot, round_bets)

    def start_hand_with_deal(
        self,
        button: int,
        hole0: List[Card],
        hole1: List[Card],
    ) -> GameState:
        """Create initial state for a fixed deal (for CFR)."""
        stacks = (self.starting_stack, self.starting_stack)
        (s0, s1), pot, round_bets = self._post_blinds(stacks, button)
        return self._make_state(button, hole0, hole1, (s0, s1), pot, round_bets)

    def _make_state(
        self,
        button: int,
        hole0: List[Card],
        hole1: List[Card],
        stacks: Tuple[float, float],
        pot: float,
        round_bets: Tuple[float, float],
    ) -> GameState:
        return GameState(
            small_blind=self.small_blind,
            big_blind=self.big_blind,
            starting_stack=self.starting_stack,
            bet_size_mults=self.bet_size_mults,
            button=button,
            current_player=button,
            hole_cards=(hole0, hole1),
            board=[],
            stacks=stacks,
            pot=pot,
            round_bets=round_bets,
            round_name="preflop",
            round_history=[],
            folded=None,
            winner=None,
        )

    def step(self, state: GameState, action: Action) -> GameState:
        """
        Apply action and return new state. Deals flop/turn/river when
        advancing streets. Does not resolve showdown; use resolve_showdown.
        """
        return self._step_impl(state, action, fixed_flop=None)

    def step_with_fixed_board(
        self,
        state: GameState,
        action: Action,
        flop: List[Card],
    ) -> GameState:
        """Like step but use fixed flop (for CFR). No turn/river when max_street=flop."""
        return self._step_impl(state, action, fixed_flop=flop)

    def _step_impl(
        self,
        state: GameState,
        action: Action,
        fixed_flop: Optional[List[Card]] = None,
    ) -> GameState:
        s = state.apply_action(action)
        r = s.round_name
        if r == "flop" and len(s.board) == 0:
            board = fixed_flop[:3] if fixed_flop else self._deck.deal(3)
            s = s.with_board(board)
        _streets = ("preflop", "flop", "turn", "river")
        use_turn = _streets.index(self.max_street) >= _streets.index("turn") if self.max_street in _streets else False
        use_river = _streets.index(self.max_street) >= _streets.index("river") if self.max_street in _streets else False
        if r == "turn" and len(s.board) == 3 and use_turn:
            extra = fixed_flop[3:4] if fixed_flop and len(fixed_flop) >= 4 else self._deck.deal(1)
            s = s.with_board(s.board + extra)
        elif r == "river" and len(s.board) == 4 and use_river:
            extra = fixed_flop[4:5] if fixed_flop and len(fixed_flop) >= 5 else self._deck.deal(1)
            s = s.with_board(s.board + extra)
        elif r == "turn" and self.max_street == "flop":
            object.__setattr__(s, "round_name", "showdown")
            s = self.resolve_showdown(s)
        elif r == "showdown":
            s = self.resolve_showdown(s)
        return s

    def resolve_showdown(self, state: GameState) -> GameState:
        """Evaluate hands, set winner, award pot. Return updated state."""
        if not state.is_showdown():
            return state
        h0 = state.hole_cards[0] or []
        h1 = state.hole_cards[1] or []
        b = state.board
        if len(b) < 3 or len(h0) < 2 or len(h1) < 2:
            return state
        s0 = self._evaluator.evaluate(h0, b)
        s1 = self._evaluator.evaluate(h1, b)
        if s0 > s1:
            w = 0
        elif s1 > s0:
            w = 1
        else:
            w = -1  # split
        total = state.total_pot
        st = list(state.stacks)
        if w >= 0:
            st[w] += total
            object.__setattr__(state, "stacks", tuple(st))
            object.__setattr__(state, "winner", w)
        else:
            half = total / 2.0
            st[0] += half
            st[1] += half
            object.__setattr__(state, "stacks", tuple(st))
            object.__setattr__(state, "winner", 0)  # arbitrary for split
        object.__setattr__(state, "round_name", "terminal")
        object.__setattr__(state, "pot", 0.0)
        object.__setattr__(state, "round_bets", (0.0, 0.0))
        return state

    def run_hand(
        self,
        button: int,
        get_action: Callable[[GameState], Action],
    ) -> Tuple[GameState, List[Tuple[GameState, Action]]]:
        """
        Run a full hand. get_action(state) returns action for current player.
        Returns (final state, [(state, action), ...] history).
        """
        state = self.start_hand(button)
        history: List[Tuple[GameState, Action]] = []
        while not state.is_terminal():
            acts = state.legal_actions()
            if not acts:
                break
            action = get_action(state)
            if action not in acts:
                raise ValueError(f"Illegal action {action}; legal {acts}")
            history.append((state, action))
            state = self.step(state, action)
        return state, history
