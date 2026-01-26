"""Interactive play against the trained CFR bot."""

from __future__ import annotations

import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from poker_bot.bot.poker_bot import PokerBot
from poker_bot.game_engine.actions import Action
from poker_bot.game_engine.game import PokerGame
from poker_bot.utils.helpers import action_token_for_history, action_to_str, parse_action


def fmt_cards(cards) -> str:
    if not cards:
        return "[]"
    return " ".join(str(c) for c in cards)


def print_state(state, human_player: int, human_hole) -> None:
    pot = state.pot + sum(state.round_bets)
    print("\n---")
    print(f"Pot: {pot:.1f}  Stacks: P0={state.stacks[0]:.1f}  P1={state.stacks[1]:.1f}")
    print(f"Round: {state.round_name}  Board: {fmt_cards(state.board)}")
    print(f"Your hole (P{human_player}): {fmt_cards(human_hole)}")
    print(f"Legal: {[action_to_str(a) for a in state.legal_actions()]}")


def main() -> None:
    ap = argparse.ArgumentParser(description="Play against CFR bot")
    ap.add_argument("--strategy", type=str, default="strategy.pkl", help="Path to strategy pickle")
    ap.add_argument("--stack", type=float, default=100.0, help="Starting stack (BB)")
    ap.add_argument("--human-first", action="store_true", help="Human is button (P0)")
    args = ap.parse_args()

    if not os.path.isfile(args.strategy):
        print(f"Strategy not found: {args.strategy}. Run main.py first.")
        sys.exit(1)

    bot = PokerBot.from_pickle(args.strategy)
    game = PokerGame(
        small_blind=0.5,
        big_blind=1.0,
        starting_stack=args.stack,
        max_street=bot.max_street,
        bet_size_mults=bot.bet_size_mults,
    )

    human = 0 if args.human_first else 1
    button = 0
    history = ""
    wins = [0, 0]
    hands = 0

    street_msg = {"flop": "Preflop + Flop only", "turn": "Preflop through Turn", "river": "Preflop through River"}
    print("Heads-up NLHE vs CFR bot. %s. Commands: f/x/c/r <amt>" % street_msg.get(bot.max_street, "Preflop + Flop only"))
    print("You are P%d. Bot is P%d.\n" % (human, 1 - human))

    while True:
        state = game.start_hand(button)
        history = ""
        human_hole = (state.hole_cards[human] or [])[:2]

        while not state.is_terminal():
            print_state(state, human, human_hole)
            cur = state.current_player
            legal = state.legal_actions()

            if cur == human:
                raw = input("Action> ").strip()
                action = parse_action(raw, legal)
                while action is None:
                    print("Invalid. Legal:", [action_to_str(a) for a in legal])
                    raw = input("Action> ").strip()
                    action = parse_action(raw, legal)
            else:
                action = bot.get_action(state, history, sample=True)
                if action is None:
                    action = legal[0]
                print("Bot plays:", action_to_str(action))

            history += action_token_for_history(state, action)
            state = game.step(state, action)

        if state.winner is not None:
            wins[state.winner] += 1
        hands += 1
        w = state.winner if state.winner is not None else -1
        win_str = "P%d" % w if w >= 0 else "Split"
        print("\nHand over. Winner: %s. Wins: You %d – Bot %d (hands %d)" % (
            win_str, wins[human], wins[1 - human], hands,
        ))
        bot_hole = state.hole_cards[1 - human] or []
        print("Bot's hand: %s" % fmt_cards(bot_hole))

        again = input("Another hand? [Y/n] ").strip().lower()
        if again in ("n", "no"):
            break
        button = 1 - button

    print("Goodbye.")


if __name__ == "__main__":
    main()
