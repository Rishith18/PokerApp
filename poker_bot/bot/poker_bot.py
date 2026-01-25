"""Bot interface using trained CFR strategy."""

from __future__ import annotations

import logging
from typing import List, Optional

import numpy as np

from poker_bot.game_engine.actions import Action
from poker_bot.game_engine.state import GameState

from poker_bot.cfr.abstraction import BetAbstraction, CardAbstraction
from poker_bot.cfr.strategy import Strategy

logger = logging.getLogger(__name__)


class PokerBot:
    """
    Load trained CFR strategy and act from average strategy.
    Given game state, map to infoset, sample (or take max) action.
    """

    def __init__(
        self,
        strategy: Strategy,
        card_abs: Optional[CardAbstraction] = None,
        bet_abs: Optional[BetAbstraction] = None,
        bet_size_mults: Optional[tuple] = None,
    ) -> None:
        self.strategy = strategy
        self.card_abs = card_abs or strategy.card_abs
        self.bet_abs = bet_abs or strategy.bet_abs
        self.bet_size_mults = bet_size_mults or (0.5, 1.0, -1)

    @classmethod
    def from_pickle(cls, path: str) -> "PokerBot":
        """Load strategy from pickle and build bot."""
        import pickle
        with open(path, "rb") as f:
            data = pickle.load(f)
        infosets = data["infosets"]
        cfg = data.get("config", {})
        card_abs = CardAbstraction(
            n_preflop_buckets=cfg.get("n_preflop", 20),
            n_postflop_buckets=cfg.get("n_postflop", 10),
        )
        bet_abs = BetAbstraction()
        strategy = Strategy(infosets, card_abs, bet_abs)
        raw = cfg.get("bet_size_mults")
        bet_size_mults = tuple(raw) if raw is not None else (0.5, 1.0, -1)
        return cls(strategy, card_abs, bet_abs, bet_size_mults)

    def get_action(
        self,
        state: GameState,
        history: str,
        *,
        sample: bool = True,
        rng: Optional[np.random.Generator] = None,
    ) -> Optional[Action]:
        """
        Return action for current player. history = action sequence so far (tokens).
        If sample=True, sample from strategy; else take argmax.
        """
        legal = state.legal_actions()
        if not legal:
            return None
        cur = state.current_player
        round_name = state.round_name
        hole = (state.hole_cards[cur] or [])[:2]
        board = state.board
        bucket = self.card_abs.hand_to_bucket(hole, board, round_name)
        probs = self.strategy.get_action_probs(cur, round_name, bucket, history, legal)
        if probs is None:
            return legal[np.random.randint(len(legal))]
        if sample:
            rng = rng or np.random.default_rng()
            i = rng.choice(len(legal), p=probs)
        else:
            i = int(np.argmax(probs))
        return legal[i]
