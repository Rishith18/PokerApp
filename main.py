"""Training script for CFR poker bot."""

from __future__ import annotations

import argparse
import logging
import os
import sys

# Ensure project root on path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from tqdm import tqdm

from poker_bot.cfr.cfr_trainer import CFRTrainer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


def main() -> None:
    ap = argparse.ArgumentParser(description="Train CFR heads-up NLHE bot")
    ap.add_argument("--iterations", type=int, default=10_000, help="CFR iterations")
    ap.add_argument("--save-every", type=int, default=0, help="Save strategy every N iterations (0=disabled)")
    ap.add_argument("--output", type=str, default="strategy.pkl", help="Output strategy path")
    ap.add_argument("--stack", type=float, default=100.0, help="Starting stack (BB)")
    ap.add_argument("--seed", type=int, default=None, help="Random seed")
    ap.add_argument(
        "--bet-mults",
        type=str,
        default=None,
        help="Bet size multipliers, comma-separated (e.g. 0.25,0.5,0.75,1,2,-1). -1=all-in. Default: 0.5,1,-1",
    )
    args = ap.parse_args()

    bet_mults: tuple[float, ...] = (0.5, 1.0, -1)
    if args.bet_mults:
        bet_mults = tuple(float(x.strip()) for x in args.bet_mults.split(","))

    trainer = CFRTrainer(
        starting_stack=args.stack,
        small_blind=0.5,
        big_blind=1.0,
        n_preflop_buckets=20,
        n_postflop_buckets=10,
        max_street="flop",
        bet_size_mults=bet_mults,
        seed=args.seed,
    )

    logger.info("Training CFR for %d iterations (preflop + flop, 100 BB)", args.iterations)
    save_path = args.output if args.save_every else None
    for t in tqdm(range(args.iterations), desc="CFR"):
        trainer.iteration(updater=t % 2)
        if args.save_every and (t + 1) % args.save_every == 0:
            trainer.save_strategy(args.output)

    trainer.save_strategy(args.output)
    logger.info("Saved strategy to %s (%d infosets)", args.output, len(trainer.infosets))

    # Simple convergence metric: run validation hands with both players using average strategy.
    try:
        from poker_bot.bot.poker_bot import PokerBot
        from poker_bot.game_engine.game import PokerGame
        from poker_bot.utils.helpers import action_token_for_history
        import random
        bot = PokerBot.from_pickle(args.output)
        game = PokerGame(
            0.5, 1.0, args.stack,
            max_street="flop",
            bet_size_mults=bot.bet_size_mults,
            seed=42,
        )
        random.seed(123)
        total_p0 = 0.0
        n_val = 200
        for _ in range(n_val):
            state = game.start_hand(_ % 2)
            history = ""
            while not state.is_terminal():
                legal = state.legal_actions()
                if not legal:
                    break
                action = bot.get_action(state, history, sample=True)
                action = action or legal[0]
                history += action_token_for_history(state, action)
                state = game.step(state, action)
            if state.winner is not None:
                total_p0 += state.stacks[0] - args.stack
        avg = total_p0 / n_val
        logger.info("Validation (%d hands, both use avg strategy): avg P0 profit = %.2f BB (≈0 => converged)", n_val, avg)
    except Exception as e:
        logger.warning("Validation skipped: %s", e)

    logger.info("Done.")


if __name__ == "__main__":
    main()
