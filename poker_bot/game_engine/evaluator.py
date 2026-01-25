"""Hand evaluation using treys library."""

from __future__ import annotations

import logging
from typing import List, Optional

from treys import Evaluator as TreysEvaluator
from treys import Card as TreysCard

from poker_bot.game_engine.card import Card

logger = logging.getLogger(__name__)


class HandEvaluator:
    """
    Wrapper around treys for 7-card hand evaluation.
    Returns normalized hand strength in [0, 1] (1 = nuts).
    """

    def __init__(self) -> None:
        self._eval = TreysEvaluator()

    def _to_treys(self, cards: List[Card]) -> List[int]:
        """Convert our Card objects to treys internal representation."""
        return [TreysCard.new(str(c)) for c in cards]

    def evaluate(
        self,
        hole: List[Card],
        board: List[Card],
    ) -> float:
        """
        Evaluate 5-7 card hand. Returns strength in [0, 1].
        Higher = stronger. 1.0 would be best possible hand.
        Treys: evaluate(board, hand); lower raw = better.
        """
        if len(hole) < 2 or len(board) < 3 or len(hole) + len(board) < 5:
            raise ValueError("Need at least 2 hole + 3 board cards")
        h = self._to_treys(hole)
        b = self._to_treys(board)
        raw = self._eval.evaluate(b, h)
        # Treys: 1 = best, 7462 = worst high hand, higher = worse
        # Normalize: 1 -> 1.0, 7462 -> 0.0 (approx)
        max_rank = 7462
        strength = 1.0 - (raw / max_rank)
        return max(0.0, min(1.0, strength))

    def rank_to_strength(self, raw_rank: int) -> float:
        """Convert treys raw rank to [0,1] strength."""
        max_rank = 7462
        return max(0.0, min(1.0, 1.0 - (raw_rank / max_rank)))
