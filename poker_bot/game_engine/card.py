"""Card and Deck classes for poker."""

from __future__ import annotations

import random
from dataclasses import dataclass
from typing import List, Optional


# Rank: 2=0, 3=1, ..., K=11, A=12 (high)
# Suit: s=spades, h=hearts, d=diamonds, c=clubs
RANKS = "23456789TJQKA"
SUITS = "shdc"

RANK_TO_INT = {r: i for i, r in enumerate(RANKS)}
INT_TO_RANK = {i: r for i, r in enumerate(RANKS)}
SUIT_TO_INT = {s: i for i, s in enumerate(SUITS)}
INT_TO_SUIT = {i: s for i, s in enumerate(SUITS)}


@dataclass(frozen=True)
class Card:
    """A playing card with rank and suit."""

    rank: int  # 0-12 (2-A)
    suit: int  # 0-3 (s,h,d,c)

    def __post_init__(self) -> None:
        if not (0 <= self.rank <= 12 and 0 <= self.suit <= 3):
            raise ValueError("Invalid rank or suit")

    @classmethod
    def from_str(cls, s: str) -> "Card":
        """Create card from string like 'As' or 'Th'."""
        if len(s) != 2:
            raise ValueError(f"Invalid card string: {s}")
        r, su = s[0].upper(), s[1].lower()
        if r not in RANK_TO_INT or su not in SUIT_TO_INT:
            raise ValueError(f"Invalid card string: {s}")
        return cls(RANK_TO_INT[r], SUIT_TO_INT[su])

    def __str__(self) -> str:
        return INT_TO_RANK[self.rank] + INT_TO_SUIT[self.suit]

    def __repr__(self) -> str:
        return f"Card({str(self)})"

    @property
    def rank_char(self) -> str:
        return INT_TO_RANK[self.rank]

    @property
    def suit_char(self) -> str:
        return INT_TO_SUIT[self.suit]

    def to_index(self) -> int:
        """Unique index 0-51 for treys compatibility."""
        return self.rank * 4 + self.suit

    @classmethod
    def from_index(cls, idx: int) -> "Card":
        """Create card from index 0-51."""
        return cls(idx // 4, idx % 4)


class Deck:
    """Standard 52-card deck with shuffle."""

    def __init__(self) -> None:
        self._cards: List[Card] = []
        self.reset()

    def reset(self) -> None:
        """Reset deck to full 52 cards."""
        self._cards = [Card(r, s) for r in range(13) for s in range(4)]

    def shuffle(self) -> None:
        """Shuffle the deck in place."""
        random.shuffle(self._cards)

    def deal(self, n: int = 1) -> List[Card]:
        """Deal n cards from the top. Raises if insufficient cards."""
        if n > len(self._cards):
            raise ValueError("Not enough cards in deck")
        out = self._cards[:n]
        self._cards = self._cards[n:]
        return out

    def __len__(self) -> int:
        return len(self._cards)
