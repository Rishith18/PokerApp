"""Bot interface using trained CFR strategy."""

from __future__ import annotations

import logging
from typing import List, Optional

import numpy as np

from poker_bot.game_engine.actions import Action, ActionType
from poker_bot.game_engine.state import GameState
from poker_bot.game_engine.evaluator import HandEvaluator

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
        max_street: str = "flop",
    ) -> None:
        self.strategy = strategy
        self.card_abs = card_abs or strategy.card_abs
        self.bet_abs = bet_abs or strategy.bet_abs
        self.bet_size_mults = bet_size_mults or (0.5, 1.0, -1)
        self.max_street = max_street
        self._hand_evaluator = HandEvaluator()

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
        max_street = cfg.get("max_street", "flop")
        return cls(strategy, card_abs, bet_abs, bet_size_mults, max_street)

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
        action = legal[i]
        
        # Safety checks to prevent bad folds
        
        # 1. If first to act (can check) and would fold, check instead
        if action.action_type == ActionType.FOLD and state.can_check:
            check_action = next((a for a in legal if a.action_type == ActionType.CHECK), None)
            if check_action is not None:
                logger.debug("Prevented fold when first to act, using check instead")
                return check_action
        
        # 2. Prevent folding with very strong hands (straight or better)
        if action.action_type == ActionType.FOLD and len(board) >= 3:
            try:
                strength = self._hand_evaluator.evaluate(hole, board)
                # Strength threshold: ~0.7 corresponds to straight or better
                # (straight is typically around rank 1600-1609 in treys, which normalizes to ~0.78)
                if strength >= 0.7:
                    # Replace fold with check/call if available
                    for alt_action in legal:
                        if alt_action.action_type == ActionType.CHECK:
                            logger.debug(f"Prevented fold with strong hand (strength={strength:.3f}), using check instead")
                            return alt_action
                        if alt_action.action_type == ActionType.CALL:
                            logger.debug(f"Prevented fold with strong hand (strength={strength:.3f}), using call instead")
                            return alt_action
                    # If no check/call available, use the action with highest probability that isn't fold
                    if len(legal) > 1:
                        non_fold_probs = [p if legal[j].action_type != ActionType.FOLD else 0 
                                         for j, p in enumerate(probs)]
                        if sum(non_fold_probs) > 0:
                            # Renormalize
                            non_fold_probs = np.array(non_fold_probs)
                            non_fold_probs = non_fold_probs / non_fold_probs.sum()
                            if sample:
                                i = rng.choice(len(legal), p=non_fold_probs)
                            else:
                                i = int(np.argmax(non_fold_probs))
                            logger.debug(f"Prevented fold with strong hand (strength={strength:.3f}), using alternative action")
                            return legal[i]
            except Exception as e:
                logger.warning(f"Error evaluating hand strength: {e}, allowing fold")
        
        # 3. For strong hands, ensure we stay in the game (prefer check/call over fold)
        if len(board) >= 3:
            try:
                strength = self._hand_evaluator.evaluate(hole, board)
                # For strong hands (two pair or better, ~0.6+), prefer staying in
                if strength >= 0.6 and action.action_type == ActionType.FOLD:
                    # Look for check/call alternatives
                    for alt_action in legal:
                        if alt_action.action_type == ActionType.CHECK:
                            logger.debug(f"Preferring check over fold for strong hand (strength={strength:.3f})")
                            return alt_action
                        if alt_action.action_type == ActionType.CALL:
                            logger.debug(f"Preferring call over fold for strong hand (strength={strength:.3f})")
                            return alt_action
            except Exception as e:
                logger.warning(f"Error evaluating hand strength: {e}")
        
        return action
