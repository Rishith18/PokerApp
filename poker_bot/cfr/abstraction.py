"""Card and bet abstractions for CFR."""

from __future__ import annotations

import logging
from typing import Dict, List

from poker_bot.game_engine.card import Card
from poker_bot.game_engine.evaluator import HandEvaluator

logger = logging.getLogger(__name__)

def _preflop_rank(hole: List[Card]) -> int:
    """
    0..168 for 169 preflop hand classes.
    Pairs 0-12 (AA..22). Suited 13-90. Offsuit 91-168.
    """
    if len(hole) != 2:
        return 0
    c0, c1 = hole[0], hole[1]
    r0, r1 = c0.rank, c1.rank
    hi, lo = max(r0, r1), min(r0, r1)
    suited = c0.suit == c1.suit
    if hi == lo:
        return 12 - hi
    idx = 0
    for h in range(12, -1, -1):
        for l in range(h - 1, -1, -1):
            if (h, l) == (hi, lo):
                return 13 + idx + (0 if suited else 78)
            idx += 1
    return 0


class CardAbstraction:
    """
    Map hands to buckets. Preflop: ~20 buckets. Postflop: ~10 buckets by strength.
    """

    def __init__(
        self,
        n_preflop_buckets: int = 20,
        n_postflop_buckets: int = 10,
    ) -> None:
        self.n_preflop = n_preflop_buckets
        self.n_postflop = n_postflop_buckets
        self._eval = HandEvaluator()
        # Preflop: 169 classes -> 20 buckets by binning
        self._preflop_map: Dict[int, int] = {}

    def _build_preflop_map(self) -> None:
        if self._preflop_map:
            return
        for i in range(169):
            self._preflop_map[i] = min(
                self.n_preflop - 1,
                (i * self.n_preflop) // 169,
            )

    def hand_to_bucket(
        self,
        hole: List[Card],
        board: List[Card],
        round_name: str,
    ) -> int:
        """
        Map (hole, board, round) to bucket index.
        Preflop: use hole only. Postflop: use hand strength percentile.
        """
        if round_name == "preflop":
            self._build_preflop_map()
            r = _preflop_rank(hole)
            return self._preflop_map.get(r, 0)
        if round_name in ("flop", "turn", "river") and len(board) >= 3:
            # Strength-based bucketing. We need many samples for percentiles;
            # use raw strength [0,1] binned into n_postflop buckets.
            try:
                strength = self._eval.evaluate(hole, board)
            except Exception:
                strength = 0.5
            b = int(strength * self.n_postflop)
            return min(self.n_postflop - 1, max(0, b))
        return 0


class BetAbstraction:
    """
    Limit bet sizes to [0.5x pot, 1x pot, all-in].
    Map legal Action to abstract action index for CFR.
    """

    def __init__(self) -> None:
        pass

    def action_to_index(self, action, legal: List) -> int:
        """Map Action to 0..K-1 over legal actions. Used for regret/strategy indexing."""
        for i, a in enumerate(legal):
            if self._action_eq(a, action):
                return i
        return -1

    def _action_eq(self, a, b) -> bool:
        from poker_bot.game_engine.actions import ActionType
        if a.action_type != b.action_type:
            return False
        if a.action_type == ActionType.RAISE:
            return (
                a.amount is not None
                and b.amount is not None
                and abs(a.amount - b.amount) < 0.01
            )
        return True
