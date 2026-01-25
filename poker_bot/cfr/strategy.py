"""Strategy computation and sampling from trained CFR."""

from __future__ import annotations

import logging
from typing import Dict, List, Optional

import numpy as np

from poker_bot.game_engine.actions import Action

from poker_bot.cfr.abstraction import BetAbstraction, CardAbstraction
from poker_bot.cfr.infoset import InfoSet

logger = logging.getLogger(__name__)


class Strategy:
    """
    Wraps trained CFR infosets. Maps (state, player) -> action distribution,
    or samples an action from the average strategy.
    """

    def __init__(
        self,
        infosets: Dict[str, InfoSet],
        card_abs: CardAbstraction,
        bet_abs: BetAbstraction,
    ) -> None:
        self.infosets = infosets
        self.card_abs = card_abs
        self.bet_abs = bet_abs

    def infoset_key(self, player: int, round_name: str, bucket: int, history: str) -> str:
        return f"{player}|{round_name}|{bucket}|{history}"

    def get_action_probs(
        self,
        player: int,
        round_name: str,
        bucket: int,
        history: str,
        legal: List[Action],
    ) -> Optional[np.ndarray]:
        """Get average strategy distribution over legal actions. None if infoset missing."""
        key = self.infoset_key(player, round_name, bucket, history)
        inf = self.infosets.get(key)
        if inf is None or len(inf.legal_actions) != len(legal):
            return None
        return inf.get_average_strategy()

    def sample_action(
        self,
        player: int,
        round_name: str,
        bucket: int,
        history: str,
        legal: List[Action],
        rng: Optional[np.random.Generator] = None,
    ) -> Optional[Action]:
        """Sample action from average strategy. None if infoset missing."""
        probs = self.get_action_probs(player, round_name, bucket, history, legal)
        if probs is None:
            return None
        rng = rng or np.random.default_rng()
        i = rng.choice(len(legal), p=probs)
        return legal[i]
