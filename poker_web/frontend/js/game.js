/**
 * Main game logic for poker web interface
 *
 * This module manages:
 * - Game state
 * - API communication
 * - User interactions
 * - Game flow
 */

class PokerGame {
    constructor() {
        this.state = null;
        this.apiBase = '/api';
        this.isProcessing = false;
        this.handsPlayed = 0;

        // Initialize UI elements
        this.elements = {
            foldBtn: document.getElementById('fold-btn'),
            callBtn: document.getElementById('call-btn'),
            raiseBtn: document.getElementById('raise-btn'),
            raiseAmount: document.getElementById('raise-amount'),
            newHandBtn: document.getElementById('new-hand-btn'),
            nextHandBtn: document.getElementById('next-hand-btn'),
            presetBtns: document.querySelectorAll('.preset-btn')
        };

        this.init();
    }

    /**
     * Initialize the game
     */
    async init() {
        this.setupEventListeners();
        await this.startNewHand();
    }

    /**
     * Setup event listeners for all buttons
     */
    setupEventListeners() {
        // Action buttons
        if (this.elements.foldBtn) {
            this.elements.foldBtn.addEventListener('click', () => this.playerAction('fold'));
        }

        if (this.elements.callBtn) {
            this.elements.callBtn.addEventListener('click', () => {
                const action = this.elements.callBtn.textContent.toLowerCase().includes('check') ? 'check' : 'call';
                this.playerAction(action);
            });
        }

        if (this.elements.raiseBtn) {
            this.elements.raiseBtn.addEventListener('click', () => this.handleRaise());
        }

        // Preset raise buttons
        this.elements.presetBtns.forEach(btn => {
            btn.addEventListener('click', () => this.handlePresetRaise(btn.dataset.multiplier));
        });

        // New hand button
        if (this.elements.newHandBtn) {
            this.elements.newHandBtn.addEventListener('click', () => this.startNewHand());
        }

        // Next hand button (in modal)
        if (this.elements.nextHandBtn) {
            this.elements.nextHandBtn.addEventListener('click', () => {
                UI.hideWinner();
                this.startNewHand();
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyboard(e) {
        if (this.isProcessing || !this.state || !this.state.can_act) return;

        switch (e.key.toLowerCase()) {
            case 'f':
                if (!this.elements.foldBtn.disabled) {
                    this.playerAction('fold');
                }
                break;
            case 'c':
                if (!this.elements.callBtn.disabled) {
                    const action = this.elements.callBtn.textContent.toLowerCase().includes('check') ? 'check' : 'call';
                    this.playerAction(action);
                }
                break;
            case 'r':
                this.elements.raiseAmount.focus();
                break;
        }
    }

    /**
     * Start a new hand
     */
    async startNewHand() {
        if (this.isProcessing) return;

        this.isProcessing = true;
        UI.showLoading(true);

        try {
            // Reset table
            await Animations.resetTable();

            // Call API to start new hand
            const response = await fetch(`${this.apiBase}/game/new`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            this.state = await response.json();
            this.handsPlayed++;

            // Update UI
            await this.updateUI();

            // Deal cards with animation
            await Animations.dealInitialHand(
                this.state.player_cards || [],
                false
            );

            UI.showLoading(false);
            this.isProcessing = false;

            // If bot acted first (already in state), show it
            if (this.state.last_action && this.state.last_action.actor === 'bot') {
                await this.displayLastAction(this.state.last_action);
            }

        } catch (error) {
            console.error('Error starting new hand:', error);
            UI.showLoading(false);
            this.isProcessing = false;
            alert('Error starting new hand. Please check the server connection.');
        }
    }

    /**
     * Process player action
     * @param {string} action - Action type ('fold', 'check', 'call', 'raise')
     * @param {number} amount - Amount for raise
     */
    async playerAction(action, amount = null) {
        if (this.isProcessing || !this.state || !this.state.can_act) return;

        this.isProcessing = true;
        UI.showLoading(true);

        try {
            // Show player action
            let actionText = action.charAt(0).toUpperCase() + action.slice(1);
            if (action === 'raise' && amount) {
                actionText = `Raise ${amount.toFixed(2)}`;
            }
            await Animations.showActionAnimated('player', actionText);

            // Send action to server
            const requestBody = { action };
            if (amount !== null) {
                requestBody.amount = amount;
            }

            const response = await fetch(`${this.apiBase}/game/action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const prevRound = this.state.round;
            this.state = await response.json();

            // Update UI
            await this.updateUI();

            // Check if new community cards were dealt
            if (this.state.round !== prevRound && this.state.board.length > 0) {
                await Animations.dealCommunityCards(this.state.board, this.state.round);
            }

            // Show bot's action if there was one
            if (this.state.last_action && this.state.last_action.actor === 'bot') {
                await this.displayLastAction(this.state.last_action);
            }

            // Check if hand is over
            if (this.state.hand_over) {
                await this.handleHandEnd();
            }

            UI.showLoading(false);
            this.isProcessing = false;

        } catch (error) {
            console.error('Error processing action:', error);
            UI.showLoading(false);
            this.isProcessing = false;
            alert('Error processing action. Please try again.');
        }
    }

    /**
     * Handle raise action
     */
    async handleRaise() {
        const amount = parseFloat(this.elements.raiseAmount.value);

        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid raise amount');
            return;
        }

        await this.playerAction('raise', amount);

        // Clear input
        this.elements.raiseAmount.value = '';
    }

    /**
     * Handle preset raise button
     * @param {string} multiplier - Multiplier ('0.5', '0.75', '1.0', 'allin')
     */
    async handlePresetRaise(multiplier) {
        if (!this.state) return;

        let amount;

        if (multiplier === 'allin') {
            amount = this.state.stacks.player;
        } else {
            const mult = parseFloat(multiplier);
            amount = mult * this.state.pot;

            // Round to 2 decimal places
            amount = Math.round(amount * 100) / 100;
        }

        await this.playerAction('raise', amount);
    }

    /**
     * Display last action
     * @param {Object} lastAction - Last action object
     */
    async displayLastAction(lastAction) {
        if (!lastAction) return;

        let actionText = lastAction.action;
        if (lastAction.amount !== null && lastAction.amount !== undefined) {
            actionText = `${lastAction.action} ${lastAction.amount.toFixed(2)}`;
        }

        const fullText = `${lastAction.actor === 'player' ? 'You' : 'Bot'}: ${actionText}`;

        await Animations.showActionAnimated(lastAction.actor, actionText);
        UI.updateLastAction(fullText);
    }

    /**
     * Handle end of hand
     */
    async handleHandEnd() {
        // Reveal bot's cards if not already shown
        if (this.state.bot_cards && this.state.bot_cards.length > 0) {
            await Animations.flipBotCards(this.state.bot_cards);
        }

        // Highlight winner's cards
        if (this.state.winner === 'player') {
            await Animations.highlightCards('player');
            await Animations.pushPot('player', this.state.pot);
        } else if (this.state.winner === 'bot') {
            await Animations.highlightCards('bot');
            await Animations.pushPot('bot', this.state.pot);
        }

        // Show winner modal
        let message = '';
        if (this.state.winner === 'player') {
            message = `You won ${this.state.pot.toFixed(2)}!`;
        } else if (this.state.winner === 'bot') {
            message = `Bot won ${this.state.pot.toFixed(2)}.`;
        } else {
            message = 'Split pot.';
        }

        // Show bot's cards in message
        if (this.state.bot_cards && this.state.bot_cards.length > 0) {
            message += `\n\nBot had: ${this.state.bot_cards.join(' ')}`;
        }

        // Delay before showing modal
        await Animations.delay(1500);

        UI.showWinner(this.state.winner, message);

        // Update final stacks
        this.updateUI();
    }

    /**
     * Update all UI elements based on current state
     */
    async updateUI() {
        if (!this.state) return;

        // Update stacks
        UI.updateStack('player', this.state.stacks.player);
        UI.updateStack('bot', this.state.stacks.bot);

        // Update pot
        UI.updatePot(this.state.pot);

        // Update round
        UI.updateRound(this.state.round);

        // Update board
        UI.updateBoard(this.state.board || []);

        // Update cards (only if hand is over and we have bot cards)
        if (this.state.hand_over && this.state.bot_cards) {
            UI.updateCards('bot', this.state.bot_cards, false);
        } else if (!this.state.hand_over) {
            UI.updateCards('bot', ['', ''], true);
        }

        if (this.state.player_cards) {
            UI.updateCards('player', this.state.player_cards, false);
        }

        // Update win counter
        UI.updateWins(this.state.wins.player, this.state.wins.bot);

        // Update action buttons
        if (this.state.can_act && !this.state.hand_over) {
            UI.updateButtons(
                this.state.legal_actions,
                this.state.pot,
                this.state.stacks.player
            );
            UI.setActionPanelEnabled(true);
        } else {
            UI.setActionPanelEnabled(false);
        }

        // Update stats
        document.getElementById('hands-played').textContent = this.handsPlayed;
    }
}

// Initialize game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.game = new PokerGame();
});
