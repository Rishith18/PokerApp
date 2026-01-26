/**
 * UI update functions for poker interface
 *
 * This module handles all UI updates including:
 * - Card display
 * - Pot and stack updates
 * - Button state management
 * - Action displays
 */

const UI = {
    /**
     * Create a card element with proper styling
     * @param {string} cardStr - Card string (e.g., 'As', 'Kh', '2c')
     * @param {boolean} faceDown - Whether card is face down
     * @returns {HTMLElement} Card element
     */
    createCard(cardStr, faceDown = false) {
        const card = document.createElement('div');
        card.className = 'card';

        if (faceDown) {
            card.classList.add('card-back');
            return card;
        }

        if (!cardStr || cardStr.length < 2) {
            card.classList.add('card-placeholder');
            return card;
        }

        // Parse card string (e.g., 'As' -> rank='A', suit='s')
        const rank = cardStr[0];
        const suitChar = cardStr[1].toLowerCase();

        // Map suit characters to symbols and names
        const suitMap = {
            's': { symbol: '♠', name: 'spades', color: 'black' },
            'h': { symbol: '♥', name: 'hearts', color: 'red' },
            'd': { symbol: '♦', name: 'diamonds', color: 'red' },
            'c': { symbol: '♣', name: 'clubs', color: 'black' }
        };

        const suit = suitMap[suitChar] || { symbol: '?', name: 'unknown', color: 'black' };

        // Add suit class
        card.classList.add(suit.name);

        // Create rank element
        const rankEl = document.createElement('div');
        rankEl.className = 'card-rank';
        rankEl.textContent = rank;
        card.appendChild(rankEl);

        // Create suit element
        const suitEl = document.createElement('div');
        suitEl.className = 'card-suit';
        suitEl.textContent = suit.symbol;
        card.appendChild(suitEl);

        return card;
    },

    /**
     * Update player cards display
     * @param {string} player - 'player' or 'bot'
     * @param {Array<string>} cards - Array of card strings
     * @param {boolean} hidden - Whether to show cards face down
     */
    updateCards(player, cards, hidden = false) {
        const containerId = player === 'player' ? 'player-cards' : 'bot-cards';
        const container = document.getElementById(containerId);

        if (!container) return;

        // Clear existing cards
        container.innerHTML = '';

        // Add new cards
        if (cards && cards.length > 0) {
            cards.forEach(cardStr => {
                const cardEl = this.createCard(cardStr, hidden);
                container.appendChild(cardEl);
            });
        } else {
            // Show placeholders
            for (let i = 0; i < 2; i++) {
                const cardEl = this.createCard('', hidden);
                container.appendChild(cardEl);
            }
        }
    },

    /**
     * Update community cards (board)
     * @param {Array<string>} cards - Array of card strings
     */
    updateBoard(cards) {
        const container = document.getElementById('community-cards');
        if (!container) return;

        container.innerHTML = '';

        // Always show 5 card positions
        for (let i = 0; i < 5; i++) {
            let cardEl;
            if (i < cards.length) {
                cardEl = this.createCard(cards[i], false);
            } else {
                cardEl = this.createCard('', false);
            }
            container.appendChild(cardEl);
        }
    },

    /**
     * Update pot display
     * @param {number} amount - Pot amount
     */
    updatePot(amount) {
        const potEl = document.getElementById('pot-amount');
        if (potEl) {
            potEl.textContent = amount.toFixed(2);
        }
    },

    /**
     * Update player stack display
     * @param {string} player - 'player' or 'bot'
     * @param {number} amount - Stack amount
     */
    updateStack(player, amount) {
        const stackId = player === 'player' ? 'player-stack' : 'bot-stack';
        const stackEl = document.getElementById(stackId);
        if (stackEl) {
            stackEl.textContent = amount.toFixed(2);
        }
    },

    /**
     * Update win counter
     * @param {number} playerWins - Player win count
     * @param {number} botWins - Bot win count
     */
    updateWins(playerWins, botWins) {
        const playerWinsEl = document.getElementById('player-wins');
        const botWinsEl = document.getElementById('bot-wins');

        if (playerWinsEl) playerWinsEl.textContent = playerWins;
        if (botWinsEl) botWinsEl.textContent = botWins;
    },

    /**
     * Update round indicator
     * @param {string} round - Round name (preflop, flop, turn, river)
     */
    updateRound(round) {
        const roundEl = document.getElementById('round-indicator');
        const currentRoundEl = document.getElementById('current-round');

        if (roundEl) {
            roundEl.textContent = round.charAt(0).toUpperCase() + round.slice(1);
        }
        if (currentRoundEl) {
            currentRoundEl.textContent = round.charAt(0).toUpperCase() + round.slice(1);
        }
    },

    /**
     * Display action text for a player
     * @param {string} player - 'player' or 'bot'
     * @param {string} actionText - Action text to display
     */
    showAction(player, actionText) {
        const actionId = player === 'player' ? 'player-action' : 'bot-action';
        const actionEl = document.getElementById(actionId);

        if (actionEl) {
            actionEl.textContent = actionText;
            actionEl.classList.add('active');

            // Auto-hide after 3 seconds
            setTimeout(() => {
                actionEl.classList.remove('active');
            }, 3000);
        }
    },

    /**
     * Clear action display for a player
     * @param {string} player - 'player' or 'bot'
     */
    clearAction(player) {
        const actionId = player === 'player' ? 'player-action' : 'bot-action';
        const actionEl = document.getElementById(actionId);

        if (actionEl) {
            actionEl.classList.remove('active');
            actionEl.textContent = '';
        }
    },

    /**
     * Update action buttons based on legal actions
     * @param {Array<string>} legalActions - Array of legal action strings
     * @param {number} pot - Current pot size
     * @param {number} playerStack - Player's stack size
     */
    updateButtons(legalActions, pot, playerStack) {
        const foldBtn = document.getElementById('fold-btn');
        const callBtn = document.getElementById('call-btn');
        const raiseControls = document.getElementById('raise-controls');

        // Disable all buttons first
        if (foldBtn) foldBtn.disabled = true;
        if (callBtn) callBtn.disabled = true;
        if (raiseControls) raiseControls.classList.add('hidden');

        if (!legalActions || legalActions.length === 0) {
            return;
        }

        // Process legal actions
        let canFold = false;
        let canCheck = false;
        let canCall = false;
        let callAmount = 0;
        let canRaise = false;

        legalActions.forEach(action => {
            const actionLower = action.toLowerCase();

            if (actionLower === 'fold') {
                canFold = true;
            } else if (actionLower === 'check') {
                canCheck = true;
            } else if (actionLower.startsWith('call')) {
                canCall = true;
                // Extract call amount if present
                const match = action.match(/Call\s*\(?([\d.]+)\)?/i);
                if (match) {
                    callAmount = parseFloat(match[1]);
                }
            } else if (actionLower.startsWith('raise')) {
                canRaise = true;
            }
        });

        // Update fold button
        if (foldBtn && canFold) {
            foldBtn.disabled = false;
        }

        // Update call/check button
        if (callBtn) {
            if (canCheck) {
                callBtn.textContent = 'Check';
                callBtn.disabled = false;
            } else if (canCall) {
                if (callAmount > 0) {
                    callBtn.textContent = `Call ${callAmount.toFixed(2)}`;
                } else {
                    callBtn.textContent = 'Call';
                }
                callBtn.disabled = false;
            }
        }

        // Update raise controls
        if (raiseControls && canRaise) {
            raiseControls.classList.remove('hidden');

            // Update preset buttons with pot-based amounts
            const presetBtns = document.querySelectorAll('.preset-btn');
            presetBtns.forEach(btn => {
                const mult = btn.dataset.multiplier;
                if (mult === 'allin') {
                    btn.textContent = 'All-In';
                } else {
                    const amount = parseFloat(mult) * pot;
                    btn.textContent = `${mult}x (${amount.toFixed(1)})`;
                }
            });
        }
    },

    /**
     * Enable or disable action panel
     * @param {boolean} enabled - Whether to enable the panel
     */
    setActionPanelEnabled(enabled) {
        const panel = document.getElementById('action-panel');
        if (panel) {
            if (enabled) {
                panel.classList.remove('hidden');
            } else {
                panel.classList.add('hidden');
            }
        }
    },

    /**
     * Update last action log
     * @param {string} text - Action text
     */
    updateLastAction(text) {
        const logEl = document.getElementById('last-action-log');
        if (logEl) {
            logEl.textContent = text;
        }
    },

    /**
     * Show loading indicator
     * @param {boolean} show - Whether to show loading
     */
    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            if (show) {
                loading.classList.add('active');
            } else {
                loading.classList.remove('active');
            }
        }
    },

    /**
     * Show winner modal
     * @param {string} winner - 'player', 'bot', or 'split'
     * @param {string} message - Additional message
     */
    showWinner(winner, message = '') {
        const modal = document.getElementById('winner-modal');
        const title = document.getElementById('winner-title');
        const messageEl = document.getElementById('winner-message');

        if (!modal || !title) return;

        let titleText = 'Hand Complete';
        if (winner === 'player') {
            titleText = '🎉 You Win! 🎉';
        } else if (winner === 'bot') {
            titleText = 'Bot Wins';
        } else if (winner === 'split') {
            titleText = 'Split Pot';
        }

        title.textContent = titleText;
        if (messageEl) {
            messageEl.textContent = message;
        }

        modal.classList.add('active');
    },

    /**
     * Hide winner modal
     */
    hideWinner() {
        const modal = document.getElementById('winner-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }
};

// Make UI globally available
window.UI = UI;
