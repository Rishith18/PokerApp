"""Vanilla CFR algorithm implementation."""

from __future__ import annotations

import logging
import random
from typing import Dict, List, Optional, Sequence, Tuple

import numpy as np

from poker_bot.game_engine.actions import Action
from poker_bot.game_engine.card import Card, Deck
from poker_bot.game_engine.game import PokerGame
from poker_bot.game_engine.state import GameState

from poker_bot.cfr.abstraction import BetAbstraction, CardAbstraction
from poker_bot.cfr.infoset import InfoSet
from poker_bot.utils.helpers import action_token_for_history

logger = logging.getLogger(__name__)


def _terminal_payoff(state: GameState, start_stacks: Tuple[float, float]) -> float:
    """Payoff for player 0 (chip difference from start)."""
    if state.folded is not None:
        total = state.total_pot
        w = state.winner
        if w == 0:
            return total - (start_stacks[0] - state.stacks[0])
        else:
            return -(start_stacks[0] - state.stacks[0])
    if state.winner is not None:
        return state.stacks[0] - start_stacks[0]
    return 0.0


class CFRTrainer:
    """
    Vanilla CFR with external sampling.
    Alternate which player updates regrets each iteration.
    """

    def __init__(
        self,
        starting_stack: float = 100.0,
        small_blind: float = 0.5,
        big_blind: float = 1.0,
        n_preflop_buckets: int = 20,
        n_postflop_buckets: int = 10,
        max_street: str = "river",
        bet_size_mults: Sequence[float] = (0.25, 0.5, 0.75, 1.0, 2.0, -1),
        seed: Optional[int] = None,
    ) -> None:
        self.starting_stack = starting_stack
        self.small_blind = small_blind
        self.big_blind = big_blind
        self.max_street = max_street
        self.bet_size_mults = tuple(bet_size_mults)
        self.card_abs = CardAbstraction(
            n_preflop_buckets=n_preflop_buckets,
            n_postflop_buckets=n_postflop_buckets,
        )
        self.bet_abs = BetAbstraction()
        self.game = PokerGame(
            small_blind=small_blind,
            big_blind=big_blind,
            starting_stack=starting_stack,
            max_street=max_street,
            bet_size_mults=self.bet_size_mults,
            seed=seed,
        )
        self._infosets: Dict[str, InfoSet] = {}
        self._deck = Deck()
        if seed is not None:
            random.seed(seed)

    def _infoset_key(
        self,
        player: int,
        state: GameState,
        history: str,
    ) -> str:
        round_name = state.round_name
        hole = (state.hole_cards[player] or [])[:2]
        board = state.board
        bucket = self.card_abs.hand_to_bucket(hole, board, round_name)
        return f"{player}|{round_name}|{bucket}|{history}"

    def _get_infoset(self, key: str, legal: List[Action]) -> InfoSet:
        if key not in self._infosets:
            self._infosets[key] = InfoSet(key, legal)
        inf = self._infosets[key]
        if len(inf.legal_actions) != len(legal):
            inf = InfoSet(key, legal)
            self._infosets[key] = inf
        return inf

    def _sample_deal(self) -> Tuple[List[Card], List[Card], List[Card]]:
        """Return (hole0, hole1, board). Board length: 3 (flop), 4 (flop+turn), or 5 (full)."""
        self._deck.reset()
        self._deck.shuffle()
        h0 = self._deck.deal(2)
        h1 = self._deck.deal(2)
        n_board = {"flop": 3, "turn": 4, "river": 5}.get(self.max_street, 3)
        board = self._deck.deal(n_board)
        return h0, h1, board

    def _payoff(
        self,
        state: GameState,
        hole0: List[Card],
        hole1: List[Card],
        board: List[Card],
        start_stacks: Tuple[float, float],
    ) -> float:
        """Compute terminal payoff for P0 (chip profit)."""
        if state.folded is not None:
            w = 1 - state.folded
            total = state.total_pot
            put0 = start_stacks[0] - state.stacks[0]
            if w == 0:
                return total - put0
            return -put0
        if state.winner is not None:
            return state.stacks[0] - start_stacks[0]
        return 0.0

    def _cfr(
        self,
        state: GameState,
        hole0: List[Card],
        hole1: List[Card],
        board: List[Card],
        history: str,
        reach0: float,
        reach1: float,
        updater: int,
        start_stacks: Tuple[float, float],
    ) -> float:
        """
        CFR recursion. Returns counterfactual value for current node.
        External sampling: we only branch on updater's actions; sample for opponent.
        """
        if state.is_terminal():
            return self._payoff(state, hole0, hole1, board, start_stacks)

        legal = state.legal_actions()
        if not legal:
            return 0.0

        cur = state.current_player
        key = self._infoset_key(cur, state, history)
        infoset = self._get_infoset(key, legal)
        strategy = infoset.get_strategy(reach0 if cur == 0 else reach1)

        opp = 1 - cur
        reach_opp = reach1 if cur == 0 else reach0

        reach_cur = reach0 if cur == 0 else reach1
        if cur == updater:
            n = len(legal)
            cfv_action = np.zeros(n)
            for i, act in enumerate(legal):
                ns = self.game.step_with_fixed_board(state, act, board)
                h2 = history + action_token_for_history(state, act)
                if cur == 0:
                    r0, r1 = reach0 * strategy[i], reach1
                else:
                    r0, r1 = reach0, reach1 * strategy[i]
                cfv_action[i] = self._cfr(
                    ns, hole0, hole1, board, h2, r0, r1, updater, start_stacks
                )
            cfv = np.dot(strategy, cfv_action)
            for i in range(n):
                infoset.update_regret(i, reach_opp * (cfv_action[i] - cfv))
            infoset.update_strategy(strategy, reach_cur)
            return cfv
        else:
            i = np.random.choice(len(legal), p=strategy)
            act = legal[i]
            ns = self.game.step_with_fixed_board(state, act, board)
            h2 = history + action_token_for_history(state, act)
            if cur == 0:
                r0, r1 = reach0 * strategy[i], reach1
            else:
                r0, r1 = reach0, reach1 * strategy[i]
            return self._cfr(
                ns, hole0, hole1, board, h2, r0, r1, updater, start_stacks
            )

    def iteration(self, updater: int) -> None:
        """Run one CFR iteration (one sampled deal)."""
        hole0, hole1, board = self._sample_deal()
        button = random.randint(0, 1)
        state = self.game.start_hand_with_deal(button, hole0, hole1)
        start_stacks = (self.starting_stack, self.starting_stack)
        self._cfr(
            state,
            hole0,
            hole1,
            board,
            "",
            reach0=1.0,
            reach1=1.0,
            updater=updater,
            start_stacks=start_stacks,
        )

    def train(
        self,
        iterations: int = 10_000,
        save_every: Optional[int] = None,
        save_path: Optional[str] = None,
    ) -> Dict[str, InfoSet]:
        """
        Run training loop. Alternate updater each iteration.
        Optionally save strategy to disk every save_every iterations.
        """
        for t in range(iterations):
            updater = t % 2
            self.iteration(updater)
            if save_every and save_path and (t + 1) % save_every == 0:
                self.save_strategy(save_path)
        return self._infosets

    def save_strategy(self, path: str) -> None:
        """Serialize strategy (average strategy per infoset) to pickle."""
        import pickle
        data = {
            "infosets": self._infosets,
            "config": {
                "starting_stack": self.starting_stack,
                "small_blind": self.small_blind,
                "big_blind": self.big_blind,
                "max_street": self.max_street,
                "bet_size_mults": list(self.game.bet_size_mults),
                "n_preflop": self.card_abs.n_preflop,
                "n_postflop": self.card_abs.n_postflop,
            },
        }
        with open(path, "wb") as f:
            pickle.dump(data, f)
        logger.info("Saved strategy to %s", path)

    def load_strategy(self, path: str) -> None:
        """Load strategy from pickle."""
        import pickle
        with open(path, "rb") as f:
            data = pickle.load(f)
        self._infosets = data["infosets"]

    @property
    def infosets(self) -> Dict[str, InfoSet]:
        return self._infosets
