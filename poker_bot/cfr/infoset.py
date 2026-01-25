"""Information set class with regret and strategy storage."""

from __future__ import annotations

import logging
from typing import List, Optional

import numpy as np

from poker_bot.game_engine.actions import Action

logger = logging.getLogger(__name__)


class InfoSet:
    """
    Information set for one decision point.
    Stores cumulative regrets and cumulative strategy; computes
    current strategy via regret matching and average strategy for play.
    """

    def __init__(self, key: str, legal_actions: List[Action]) -> None:
        self.key = key
        self.legal_actions = legal_actions
        n = len(legal_actions)
        self.regret_sum: np.ndarray = np.zeros(n, dtype=np.float64)
        self.strategy_sum: np.ndarray = np.zeros(n, dtype=np.float64)

    def get_strategy(self, reach_weight: float = 1.0) -> np.ndarray:
        """
        Regret-matching strategy. Positive regrets -> proportional to regrets;
        else uniform. Used during CFR traversal.
        """
        n = len(self.legal_actions)
        reg = np.maximum(self.regret_sum, 0.0)
        s = np.sum(reg)
        if s > 0:
            strategy = reg / s
        else:
            strategy = np.ones(n) / n
        return strategy

    def get_average_strategy(self) -> np.ndarray:
        """
        Average strategy over training (strategy_sum / normalizer).
        Used for play; converges to Nash in two-player zero-sum.
        """
        n = len(self.legal_actions)
        s = np.sum(self.strategy_sum)
        if s <= 0:
            return np.ones(n) / n
        return self.strategy_sum / s

    def update_regret(self, action_idx: int, amount: float) -> None:
        """Add amount to regret for action_idx."""
        if 0 <= action_idx < len(self.legal_actions):
            self.regret_sum[action_idx] += amount

    def update_strategy(self, strategy: np.ndarray, reach_weight: float) -> None:
        """Add reach_weight * strategy to cumulative strategy."""
        n = min(len(strategy), len(self.strategy_sum))
        self.strategy_sum[:n] += reach_weight * strategy[:n]

    def __repr__(self) -> str:
        return f"InfoSet({self.key}, n_actions={len(self.legal_actions)})"
