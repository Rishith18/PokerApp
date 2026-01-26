"""Wrapper around PokerKit for CFR compatibility.

This module provides a clean interface between PokerKit's game engine
and the CFR algorithm, handling state extraction, action conversion,
and game progression.
"""

from typing import List, Tuple, Optional, Dict, Any
from pokerkit import NoLimitTexasHoldem, Automation
from pokerkit.utilities import Card


class PokerKitWrapper:
    """Wrapper class for PokerKit NoLimitTexasHoldem game state.
    
    This wrapper provides a CFR-friendly interface to PokerKit's game engine,
    handling state extraction, action conversion, and game progression.
    
    Attributes:
        stack_size: Starting stack size in big blinds
        small_blind: Small blind amount
        big_blind: Big blind amount
        state: Current PokerKit game state
        automation: Automation instance for dealing cards
        betting_history: String representation of betting actions taken
        initial_stacks: Initial stack sizes for both players
        
    Example:
        >>> wrapper = PokerKitWrapper(stack_size=100, small_blind=0.5, big_blind=1)
        >>> wrapper.reset()
        >>> actions = wrapper.get_legal_actions()
        >>> wrapper.apply_action(actions[0])
    """
    
    def __init__(self, stack_size: float = 100.0, small_blind: float = 0.5, big_blind: float = 1.0):
        """Initialize the PokerKit wrapper.
        
        Args:
            stack_size: Starting stack size in big blinds (default: 100)
            small_blind: Small blind amount (default: 0.5)
            big_blind: Big blind amount (default: 1.0)
        """
        self.stack_size = stack_size
        self.small_blind = small_blind
        self.big_blind = big_blind
        self.initial_stacks = [stack_size * big_blind, stack_size * big_blind]
        self.state: Optional[NoLimitTexasHoldem] = None
        self.automation: Optional[Automation] = None
        self.betting_history: str = ""
        self.action_history: List[Tuple[int, Tuple[str, Optional[float]]]] = []  # (player, action)
        self.hole_cards_0: Optional[str] = None
        self.hole_cards_1: Optional[str] = None
        self.reset()
    
    def reset(self, hole_cards_0: Optional[str] = None, hole_cards_1: Optional[str] = None) -> None:
        """Reset the game state and start a new hand.
        
        Creates a new PokerKit game state with 2 players and deals cards
        using Automation. The betting history is cleared.
        
        Args:
            hole_cards_0: Optional card string for player 0 (e.g., 'AcKh')
            hole_cards_1: Optional card string for player 1 (e.g., 'QdJc')
        """
        # Store hole cards for replay
        self.hole_cards_0 = hole_cards_0
        self.hole_cards_1 = hole_cards_1
        
        # Use Automation enum values for automatic handling
        # We'll automate: blind posting, card dealing, card burning, etc.
        automations = (
            Automation.ANTE_POSTING,
            Automation.BLIND_OR_STRADDLE_POSTING,
            Automation.CARD_BURNING,
            Automation.HOLE_DEALING,
            Automation.BOARD_DEALING,
            Automation.HOLE_CARDS_SHOWING_OR_MUCKING,
            Automation.HAND_KILLING,
            Automation.BET_COLLECTION,
            Automation.CHIPS_PUSHING,
            Automation.CHIPS_PULLING,
        )
        
        self.state = NoLimitTexasHoldem.create_state(
            automations,  # automations tuple
            False,  # ante_trimming_status
            (),  # raw_antes
            (self.small_blind, self.big_blind),  # raw_blinds_or_straddles
            1,  # min_bet (minimum bet size, typically 1)
            (self.initial_stacks[0], self.initial_stacks[1]),  # raw_starting_stacks
            2,  # player_count
        )
        
        # Store automations for reference
        self.automations = automations
        
        self.betting_history = ""
        self.action_history = []
    
    def get_legal_actions(self) -> List[Tuple[str, Optional[float]]]:
        """Get list of legal actions from current game state.
        
        Returns:
            List of tuples (action_type, amount) where action_type is one of:
            - 'fold': No amount needed
            - 'check': No amount needed  
            - 'call': Amount is the call amount
            - 'bet': Amount is the bet size
            - 'raise': Amount is the raise size
            
        Example:
            >>> actions = wrapper.get_legal_actions()
            >>> # Returns: [('fold', None), ('call', 1.0), ('bet', 2.0), ...]
        """
        if self.state is None:
            return []
        
        legal_actions = []
        
        # Check for fold
        if self.state.can_fold():
            legal_actions.append(('fold', None))
        
        # Check for check/call
        if self.state.can_check_or_call():
            # Get call amount (difference between current bet and player's contribution)
            actor = self.state.actor_index
            if actor is not None:
                try:
                    bets = self.state.bets
                    total_bet = max(bets) if bets else 0
                    player_bet = bets[actor] if actor < len(bets) else 0
                    call_amount = total_bet - player_bet
                    if call_amount == 0:
                        legal_actions.append(('check', None))
                    else:
                        legal_actions.append(('call', float(call_amount)))
                except:
                    legal_actions.append(('check', None))
        
        # Check for bet/raise
        if self.state.can_complete_bet_or_raise_to():
            actor = self.state.actor_index
            if actor is not None:
                try:
                    stacks = self.state.stacks
                    pot = self.state.total_pot_amount
                    min_raise = self.state.betting_structure.min_raise
                    
                    # Add bet options: 0.5x pot, 1x pot, all-in
                    bet_sizes = [0.5 * pot, 1.0 * pot, float(stacks[actor])]
                    for bet_size in bet_sizes:
                        if bet_size >= min_raise and bet_size <= stacks[actor]:
                            legal_actions.append(('bet', bet_size))
                except:
                    pass
        
        return legal_actions
    
    def apply_action(self, action: Tuple[str, Optional[float]], player: Optional[int] = None) -> None:
        """Apply an action to the game state.
        
        Args:
            action: Tuple of (action_type, amount) as returned by get_legal_actions()
            player: Optional player index (if None, uses current player)
            
        Example:
            >>> wrapper.apply_action(('call', 1.0))
            >>> wrapper.apply_action(('fold', None))
        """
        if self.state is None:
            return
        
        action_type, amount = action
        
        # Get current player if not provided
        if player is None:
            player = self.get_current_player()
        
        # Update betting history for infoset key generation
        if action_type == 'fold':
            self.betting_history += 'f'
        elif action_type == 'check':
            self.betting_history += 'k'
        elif action_type == 'call':
            self.betting_history += 'c'
        elif action_type == 'bet':
            self.betting_history += f'b{amount:.1f}'
        elif action_type == 'raise':
            self.betting_history += f'r{amount:.1f}'
        
        # Store in action history
        self.action_history.append((player, action))
        
        # Apply action to PokerKit state using state methods
        if action_type == 'fold' and self.state.can_fold():
            self.state.fold()
        elif action_type == 'check' and self.state.can_check_or_call():
            # Check if it's actually a check (no bet to call)
            actor = self.state.actor_index
            if actor is not None:
                try:
                    bets = self.state.bets
                    total_bet = max(bets) if bets else 0
                    player_bet = bets[actor] if actor < len(bets) else 0
                    if total_bet == player_bet:
                        # It's a check
                        self.state.check_or_call()
                    else:
                        # It's a call
                        self.state.check_or_call()
                except:
                    self.state.check_or_call()
        elif action_type == 'call' and self.state.can_check_or_call():
            self.state.check_or_call()
        elif action_type in ['bet', 'raise'] and self.state.can_complete_bet_or_raise_to():
            if amount is not None:
                self.state.complete_bet_or_raise_to(int(amount))
    
    def replay_actions(self, actions: List[Tuple[int, Tuple[str, Optional[float]]]]) -> None:
        """Replay a sequence of actions from a fresh state.
        
        Args:
            actions: List of (player, action) tuples to replay
        """
        # Save current hole cards before reset
        saved_hole_0 = self.hole_cards_0
        saved_hole_1 = self.hole_cards_1
        
        # Reset to initial state (preserving hole cards)
        self.reset(saved_hole_0, saved_hole_1)
        
        # Replay all actions
        for player, action in actions:
            self.apply_action(action, player)
    
    def get_infoset_key(self, player: int) -> str:
        """Generate information set key for current state.
        
        The infoset key combines:
        - Card bucket (from abstraction)
        - Betting history
        - Street (preflop, flop, turn, river)
        
        Args:
            player: Player index (0 or 1)
            
        Returns:
            String representation of the information set
            
        Example:
            >>> key = wrapper.get_infoset_key(player=0)
            >>> # Returns: "preflop_bucket5_cb"
        """
        street = self.get_street()
        hole_cards = self.get_hole_cards(player)
        board = self.get_board()
        
        # Card bucket will be computed by abstraction module
        # For now, use a placeholder that will be replaced
        card_info = f"{street}_{len(hole_cards)}cards_{len(board)}board"
        
        return f"{card_info}_{self.betting_history}"
    
    def get_street(self) -> str:
        """Get current betting street.
        
        Returns:
            One of: 'preflop', 'flop', 'turn', 'river'
        """
        if self.state is None:
            return 'preflop'
        
        # Check board cards to determine street
        board = self.get_board()
        if len(board) == 0:
            return 'preflop'
        elif len(board) == 3:
            return 'flop'
        elif len(board) == 4:
            return 'turn'
        elif len(board) == 5:
            return 'river'
        return 'preflop'
    
    def get_hole_cards(self, player: int) -> List[Card]:
        """Get hole cards for a player.
        
        Args:
            player: Player index (0 or 1)
            
        Returns:
            List of Card objects (empty if cards not visible to this player)
        """
        if self.state is None:
            return []
        
        try:
            hole_cards = self.state.hole_cards[player]
            if hole_cards is None:
                return []
            return list(hole_cards) if hole_cards else []
        except (IndexError, AttributeError):
            return []
    
    def get_board(self) -> List[Card]:
        """Get board cards.
        
        Returns:
            List of Card objects on the board
        """
        if self.state is None:
            return []
        
        try:
            board = self.state.board_cards
            if board is None:
                return []
            return list(board) if board else []
        except AttributeError:
            return []
    
    def get_pot(self) -> float:
        """Get current pot size.
        
        Returns:
            Total pot size
        """
        if self.state is None:
            return 0.0
        
        try:
            return float(self.state.total_pot_amount)
        except AttributeError:
            return 0.0
    
    def get_stacks(self) -> Tuple[float, float]:
        """Get current stack sizes for both players.
        
        Returns:
            Tuple of (player_0_stack, player_1_stack)
        """
        if self.state is None:
            return (self.initial_stacks[0], self.initial_stacks[1])
        
        try:
            stacks = self.state.stacks
            return (float(stacks[0]), float(stacks[1]))
        except (AttributeError, IndexError):
            return (self.initial_stacks[0], self.initial_stacks[1])
    
    def is_terminal(self) -> bool:
        """Check if the hand is over.
        
        Returns:
            True if hand is finished (folded, showdown, or all-in)
        """
        if self.state is None:
            return True
        
        try:
            # Check if there's a current actor - if no actor, hand is terminal
            actor_index = self.state.actor_index
            if actor_index is None:
                return True
            
            # Check if any betting actions are possible
            # If we can't fold, check, call, or bet, the hand is terminal
            if not (self.state.can_fold() or 
                    self.state.can_check_or_call() or 
                    self.state.can_complete_bet_or_raise_to()):
                return True
            
            # If we can act, it's not terminal
            return False
        except AttributeError:
            # Fallback: check if no legal actions remain
            legal_actions = self.get_legal_actions()
            return len(legal_actions) == 0
    
    def get_payoffs(self) -> Tuple[float, float]:
        """Get final payoffs for both players.
        
        Returns:
            Tuple of (player_0_payoff, player_1_payoff) where payoff is
            chip change from start of hand (can be negative)
        """
        if self.state is None:
            return (0.0, 0.0)
        
        stacks = self.get_stacks()
        initial_stacks = self.initial_stacks
        
        payoff_0 = stacks[0] - initial_stacks[0]
        payoff_1 = stacks[1] - initial_stacks[1]
        
        return (payoff_0, payoff_1)
    
    def get_hand_strength(self, player: int) -> float:
        """Get normalized hand strength for abstractions.
        
        Uses PokerKit's hand evaluation to compute hand strength.
        For preflop, uses hole card rank. For postflop, evaluates
        against random opponent hands.
        
        Args:
            player: Player index (0 or 1)
            
        Returns:
            Normalized hand strength between 0.0 and 1.0
        """
        if self.state is None:
            return 0.5
        
        hole_cards = self.get_hole_cards(player)
        board = self.get_board()
        
        if len(hole_cards) < 2:
            return 0.5
        
        try:
            # Use PokerKit's hand evaluation
            # For preflop, use hole card strength
            if len(board) == 0:
                # Preflop: evaluate hole cards
                # PokerKit can evaluate hands
                # This is a simplified version - full implementation would
                # use PokerKit's hand ranking system
                return 0.5  # Placeholder
            else:
                # Postflop: evaluate against random opponent
                # This would require Monte Carlo simulation
                return 0.5  # Placeholder
        except Exception:
            return 0.5
    
    def get_current_player(self) -> int:
        """Get the index of the current player to act.
        
        Returns:
            Player index (0 or 1), or -1 if terminal
        """
        if self.is_terminal():
            return -1
        
        if self.state is None:
            return 0
        
        try:
            # PokerKit tracks current actor
            actor_index = self.state.actor_index
            if actor_index is not None:
                return actor_index
            # Fallback: determine from betting history
            return len(self.betting_history) % 2
        except AttributeError:
            # Fallback: determine from betting history
            return len(self.betting_history) % 2
    
    def copy(self) -> 'PokerKitWrapper':
        """Create a copy of the wrapper (state is not deeply copied).
        
        Note: PokerKit state is not easily copyable. For CFR, we maintain
        action history and replay when needed.
        
        Returns:
            New PokerKitWrapper instance with same configuration
        """
        new_wrapper = PokerKitWrapper(
            stack_size=self.stack_size,
            small_blind=self.small_blind,
            big_blind=self.big_blind
        )
        # Copy betting history
        new_wrapper.betting_history = self.betting_history
        return new_wrapper
    
    def get_state_snapshot(self) -> dict:
        """Get a snapshot of current state for debugging.
        
        Returns:
            Dictionary with state information
        """
        return {
            'betting_history': self.betting_history,
            'pot': self.get_pot(),
            'stacks': self.get_stacks(),
            'street': self.get_street(),
            'is_terminal': self.is_terminal(),
        }
