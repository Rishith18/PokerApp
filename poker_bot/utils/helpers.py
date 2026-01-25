"""Utility functions for the poker bot."""

from __future__ import annotations

from typing import List, Optional

from poker_bot.game_engine.actions import Action, ActionType
from poker_bot.game_engine.state import GameState


def action_to_str(a: Action) -> str:
    """Serialize action for display or logging."""
    if a.action_type == ActionType.RAISE and a.amount is not None:
        return f"raise {a.amount}"
    return a.action_type.value.lower()


def action_token_for_history(state: GameState, action: Action) -> str:
    """
    Encode action for history string (must match CFR abstraction).
    Uses state.bet_size_mults. Raises map to r0, r1, ... r{k} by nearest
    fractional mult (implied = (add - call) / pot), or 'ra' for all-in.
    """
    if action.action_type == ActionType.FOLD:
        return "f"
    if action.action_type == ActionType.CHECK:
        return "x"
    if action.action_type == ActionType.CALL:
        return "c"
    if action.action_type != ActionType.RAISE or action.amount is None:
        return "?"
    pot = state.pot + sum(state.round_bets)
    my_bet = state.round_bets[state.current_player]
    call = state.call_amount
    add = action.amount - my_bet
    if add >= state.stacks[state.current_player] - 0.01:
        return "ra"
    mults = state.bet_size_mults
    frac = [m for m in mults if m != -1]
    if not frac or pot <= 0:
        return "ra"
    implied = (add - call) / pot if call < add else 0.0
    k = min(range(len(frac)), key=lambda i: abs(frac[i] - implied))
    return f"r{k}"


def parse_action(s: str, legal: List[Action]) -> Optional[Action]:
    """
    Parse user input into an Action. Must match one of legal actions.
    Examples: 'f'/'fold', 'x'/'check', 'c'/'call', 'r 10'/'raise 10'.
    """
    s = s.strip().lower()
    if not s:
        return None
    parts = s.split()
    cmd = parts[0]
    amount = float(parts[1]) if len(parts) > 1 else None
    if cmd in ("f", "fold"):
        for a in legal:
            if a.action_type == ActionType.FOLD:
                return a
        return None
    if cmd in ("x", "k", "check"):
        for a in legal:
            if a.action_type == ActionType.CHECK:
                return a
        return None
    if cmd in ("c", "call"):
        for a in legal:
            if a.action_type == ActionType.CALL:
                return a
        return None
    if cmd in ("r", "b", "raise", "bet"):
        raises = [a for a in legal if a.action_type == ActionType.RAISE and a.amount is not None]
        if not raises:
            return None
        if amount is None:
            return raises[0]
        best = min(raises, key=lambda a: abs(a.amount - amount))
        return best
    return None
