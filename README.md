# CFR Poker Bot

A complete Counterfactual Regret Minimization (CFR) poker bot for heads-up no-limit Texas Hold'em, built using the PokerKit library.

## Project Structure

```
poker_bot/
├── game_wrapper/          # PokerKit integration wrapper
│   ├── __init__.py
│   └── pokerkit_wrapper.py
├── cfr/                   # CFR algorithm implementation
│   ├── __init__.py
│   ├── abstraction.py     # Card and bet abstractions
│   ├── cfr_trainer.py     # Vanilla CFR algorithm
│   ├── infoset.py         # Information set storage
│   └── strategy.py        # Strategy computation
├── bot/                   # Bot interface
│   ├── __init__.py
│   └── poker_bot.py
├── utils/                 # Utility functions
│   ├── __init__.py
│   └── helpers.py
├── main.py               # Training script
├── play.py               # Interactive play script
└── requirements.txt
```

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

### Training the Bot

Train the CFR bot by running:

```bash
python main.py
```

This will:
- Initialize a PokerKit game with 2 players, 100 BB stacks, and 0.5/1 BB blinds
- Train the bot using vanilla CFR with external sampling
- Run for 50,000 iterations (configurable)
- Save the trained strategy to `cfr_strategy.pkl`
- Display example information sets and strategies

### Playing Against the Bot

After training, play interactively:

```bash
python play.py
```

This will:
- Load the trained bot strategy
- Start an interactive game session
- Allow you to play as player 0 against the bot (player 1)
- Display game state, legal actions, and results

## Features

- **CFR Algorithm**: Vanilla CFR with external sampling
- **Card Abstraction**: 
  - Preflop: 13 buckets based on hand strength
  - Postflop: 10 buckets based on hand strength percentiles
- **Bet Abstraction**: Simplified to 3 sizes (0.5x pot, 1x pot, all-in)
- **PokerKit Integration**: Full integration with PokerKit's game engine
- **Strategy Storage**: Save/load trained strategies using pickle

## Configuration

Edit `main.py` to adjust:
- `stack_size`: Starting stack in big blinds (default: 100)
- `small_blind`: Small blind amount (default: 0.5)
- `big_blind`: Big blind amount (default: 1.0)
- `num_iterations`: Training iterations (default: 50000)

## Algorithm Details

The bot uses Counterfactual Regret Minimization (CFR) to learn an approximate Nash equilibrium strategy:

1. **External Sampling**: Traverses one path per iteration, sampling opponent actions
2. **Regret Matching**: Updates action probabilities based on counterfactual regrets
3. **Average Strategy**: Computes average strategy over all iterations
4. **Abstractions**: Reduces game tree size using card and bet abstractions

## Limitations (V1)

- Fixed stack sizes (100 BB)
- Limited to 3 bet sizes
- Coarse card abstractions
- Trains preflop + flop initially
- Pure CFR (no CFR+ or Monte Carlo variants)

## Future Improvements

- Add turn and river streets
- Implement CFR+ algorithm
- Finer card abstractions
- More bet sizes
- Monte Carlo CFR variants
- Tournament play support

## References

- PokerKit: https://github.com/uoftcprg/pokerkit
- CFR Algorithm: Zinkevich et al., "Regret Minimization in Games with Incomplete Information"
