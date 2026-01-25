"""Action types and validation for poker."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import List, Optional

from poker_bot.game_engine.card import Card


class ActionType(Enum):
    """Legal action types."""

    FOLD = "fold"
    CHECK = "check"
    CALL = "call"
    RAISE = "raise"


@dataclass
class Action:
    """A single player action."""

    action_type: ActionType
    amount: Optional[float] = None  # For RAISE: total bet size (not delta)

    def __post_init__(self) -> None:
        if self.action_type == ActionType.RAISE and self.amount is None:
            raise ValueError("Raise requires amount")

    def __str__(self) -> str:
        if self.action_type == ActionType.RAISE:
            return f"Raise({self.amount})"
        return self.action_type.value.capitalize()


def get_legal_actions(
    *,
    can_check: bool,
    call_amount: float,
    my_current_bet: float,
    min_raise_total: float,
    max_raise_total: float,
    pot: float,
    bet_size_mults: List[float],
) -> List[Action]:
    """
    Return list of legal actions given current state.
    Raise amount = total bet this round (not delta).
    bet_size_mults: [0.5, 1.0] for 0.5x pot / 1x pot, -1 for all-in.
    """
    actions: List[Action] = [Action(ActionType.FOLD)]
    if can_check:
        actions.append(Action(ActionType.CHECK))
    if call_amount > 0:
        actions.append(Action(ActionType.CALL))
    seen_total: set = set()
    for m in bet_size_mults:
        if m == -1:
            total = max_raise_total
        else:
            total = my_current_bet + call_amount + m * pot
        if min_raise_total <= total <= max_raise_total and total > my_current_bet + call_amount:
            k = round(total, 2)
            if k not in seen_total:
                seen_total.add(k)
                actions.append(Action(ActionType.RAISE, amount=total))
    if max_raise_total > my_current_bet + call_amount:
        k = round(max_raise_total, 2)
        if k not in seen_total:
            seen_total.add(k)
            actions.append(Action(ActionType.RAISE, amount=max_raise_total))
    return actions
