/**
 * Animation functions for poker interface
 *
 * This module handles all animations including:
 * - Card dealing
 * - Card flipping
 * - Chip movements
 * - Pot animations
 */

const Animations = {
    /**
     * Delay helper function
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Deal cards to a player with animation
     * @param {string} player - 'player' or 'bot'
     * @param {Array<string>} cards - Array of card strings
     * @param {boolean} faceDown - Whether cards are face down
     * @returns {Promise}
     */
    async dealCards(player, cards, faceDown = false) {
        const containerId = player === 'player' ? 'player-cards' : 'bot-cards';
        const container = document.getElementById(containerId);

        if (!container) return;

        // Clear existing cards
        container.innerHTML = '';

        // Deal each card with delay
        for (let i = 0; i < cards.length; i++) {
            await this.delay(200);

            const cardEl = UI.createCard(cards[i], faceDown);
            cardEl.classList.add('card-dealing');
            container.appendChild(cardEl);

            // Remove animation class after animation completes
            await this.delay(300);
            cardEl.classList.remove('card-dealing');
        }
    },

    /**
     * Deal community cards (flop, turn, river) with animation
     * @param {Array<string>} cards - Array of card strings to deal
     * @param {string} round - Round name ('flop', 'turn', 'river')
     * @returns {Promise}
     */
    async dealCommunityCards(cards, round) {
        const container = document.getElementById('community-cards');
        if (!container) return;

        // Determine which cards to animate based on round
        let startIndex = 0;
        let cardsToAdd = [];

        if (round === 'flop') {
            // Deal first 3 cards
            startIndex = 0;
            cardsToAdd = cards.slice(0, 3);
        } else if (round === 'turn') {
            // Deal 4th card
            startIndex = 3;
            cardsToAdd = cards.slice(3, 4);
        } else if (round === 'river') {
            // Deal 5th card
            startIndex = 4;
            cardsToAdd = cards.slice(4, 5);
        }

        // Deal each new card with animation
        for (let i = 0; i < cardsToAdd.length; i++) {
            await this.delay(300);

            const cardIndex = startIndex + i;
            const cardEl = container.children[cardIndex];

            if (cardEl) {
                // Flip animation
                cardEl.classList.add('card-flipping');

                await this.delay(200);

                // Replace with actual card
                const newCard = UI.createCard(cardsToAdd[i], false);
                newCard.classList.add('card-flipping');
                cardEl.replaceWith(newCard);

                await this.delay(200);
                newCard.classList.remove('card-flipping');
            }
        }
    },

    /**
     * Flip bot's cards face up at showdown
     * @param {Array<string>} cards - Bot's hole cards
     * @returns {Promise}
     */
    async flipBotCards(cards) {
        const container = document.getElementById('bot-cards');
        if (!container || !cards || cards.length === 0) return;

        const cardElements = container.querySelectorAll('.card');

        for (let i = 0; i < Math.min(cards.length, cardElements.length); i++) {
            await this.delay(200);

            const cardEl = cardElements[i];
            cardEl.classList.add('card-flipping');

            await this.delay(200);

            // Replace with face-up card
            const newCard = UI.createCard(cards[i], false);
            newCard.classList.add('card-flipping');
            cardEl.replaceWith(newCard);

            await this.delay(200);
            newCard.classList.remove('card-flipping');
        }
    },

    /**
     * Animate pot update
     * @param {number} newAmount - New pot amount
     * @returns {Promise}
     */
    async updatePotAnimated(newAmount) {
        const potEl = document.getElementById('pot-amount');
        if (!potEl) return;

        // Get current amount
        const currentAmount = parseFloat(potEl.textContent) || 0;

        // Animate number counting up
        const duration = 500; // ms
        const steps = 20;
        const stepSize = (newAmount - currentAmount) / steps;
        const stepDelay = duration / steps;

        for (let i = 0; i < steps; i++) {
            await this.delay(stepDelay);
            const amount = currentAmount + (stepSize * (i + 1));
            potEl.textContent = amount.toFixed(2);
        }

        // Ensure final value is exact
        potEl.textContent = newAmount.toFixed(2);

        // Add pulse effect
        potEl.parentElement.style.transform = 'scale(1.1)';
        await this.delay(200);
        potEl.parentElement.style.transform = 'scale(1)';
    },

    /**
     * Animate chips moving to pot
     * @param {string} player - 'player' or 'bot'
     * @param {number} amount - Amount being bet
     * @returns {Promise}
     */
    async chipsToPot(player, amount) {
        // This is a simplified version - could be enhanced with actual chip graphics
        const stackId = player === 'player' ? 'player-stack' : 'bot-stack';
        const stackEl = document.getElementById(stackId);

        if (stackEl) {
            // Pulse effect on stack
            stackEl.parentElement.style.transform = 'scale(0.9)';
            await this.delay(100);
            stackEl.parentElement.style.transform = 'scale(1)';
        }

        // Update pot with animation
        const potEl = document.getElementById('pot-amount');
        if (potEl) {
            const currentPot = parseFloat(potEl.textContent) || 0;
            await this.updatePotAnimated(currentPot + amount);
        }
    },

    /**
     * Animate pot being pushed to winner
     * @param {string} winner - 'player' or 'bot'
     * @param {number} amount - Pot amount
     * @returns {Promise}
     */
    async pushPot(winner, amount) {
        const stackId = winner === 'player' ? 'player-stack' : 'bot-stack';
        const stackEl = document.getElementById(stackId);
        const potEl = document.getElementById('pot-amount');

        // Animate pot shrinking
        if (potEl) {
            potEl.parentElement.style.transform = 'scale(0.8)';
            await this.delay(300);
            potEl.textContent = '0.00';
            potEl.parentElement.style.transform = 'scale(1)';
        }

        // Animate stack growing
        if (stackEl) {
            stackEl.parentElement.style.transform = 'scale(1.2)';
            stackEl.parentElement.style.borderColor = 'var(--gold)';
            await this.delay(500);
            stackEl.parentElement.style.transform = 'scale(1)';
            stackEl.parentElement.style.borderColor = 'var(--gold)';
        }
    },

    /**
     * Highlight player's cards
     * @param {string} player - 'player' or 'bot'
     * @returns {Promise}
     */
    async highlightCards(player) {
        const containerId = player === 'player' ? 'player-cards' : 'bot-cards';
        const container = document.getElementById(containerId);

        if (!container) return;

        const cards = container.querySelectorAll('.card');
        cards.forEach(card => {
            card.style.boxShadow = '0 0 20px var(--gold)';
        });

        await this.delay(1000);

        cards.forEach(card => {
            card.style.boxShadow = '0 4px 8px var(--shadow-heavy)';
        });
    },

    /**
     * Show action animation
     * @param {string} player - 'player' or 'bot'
     * @param {string} action - Action text
     * @returns {Promise}
     */
    async showActionAnimated(player, action) {
        UI.showAction(player, action);
        await this.delay(500);
    },

    /**
     * Deal initial hand (hole cards to both players)
     * @param {Array<string>} playerCards - Player's cards
     * @param {boolean} showBotCards - Whether to show bot's cards
     * @param {Array<string>} botCards - Bot's cards (if showing)
     * @returns {Promise}
     */
    async dealInitialHand(playerCards, showBotCards = false, botCards = []) {
        // Deal to bot first (face down unless showBotCards is true)
        if (showBotCards && botCards.length > 0) {
            await this.dealCards('bot', botCards, false);
        } else {
            await this.dealCards('bot', ['', ''], true);
        }

        await this.delay(300);

        // Deal to player (face up)
        await this.dealCards('player', playerCards, false);

        await this.delay(300);
    },

    /**
     * Reset table for new hand
     * @returns {Promise}
     */
    async resetTable() {
        // Clear community cards
        const communityCards = document.getElementById('community-cards');
        if (communityCards) {
            communityCards.innerHTML = '';
            for (let i = 0; i < 5; i++) {
                communityCards.appendChild(UI.createCard('', false));
            }
        }

        // Clear actions
        UI.clearAction('player');
        UI.clearAction('bot');

        // Reset pot display
        UI.updatePot(0);

        await this.delay(200);
    }
};

// Make Animations globally available
window.Animations = Animations;
