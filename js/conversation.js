/**
 * Conversation Controller
 * Handles Claude API integration and conversation management
 */

class ConversationController {
    constructor() {
        this.conversationHistory = [];
        this.isProcessing = false;
        this.historyContent = document.getElementById('historyContent');

        // Load conversation history from localStorage
        this.loadHistory();
    }

    /**
     * Send a message and get a response from Claude
     * @param {string} userMessage - The user's message
     * @returns {Promise<string>} - The assistant's response
     */
    async sendMessage(userMessage) {
        if (this.isProcessing) {
            throw new Error('Already processing a message');
        }

        this.isProcessing = true;

        try {
            // Add user message to history
            this.addToHistory('user', userMessage);

            // Prepare messages for API
            const messages = this.conversationHistory.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            // Call the backend API
            const response = await this.callClaudeAPI(messages);

            // Add assistant response to history
            this.addToHistory('assistant', response);

            return response;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Call Claude API through backend proxy
     */
    async callClaudeAPI(messages) {
        try {
            const response = await fetch(`${CONFIG.API.BASE_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: messages,
                    system: CONFIG.OPENAI.systemPrompt,
                    model: CONFIG.OPENAI.model,
                    maxTokens: CONFIG.OPENAI.maxTokens,
                    temperature: CONFIG.OPENAI.temperature,
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `API error: ${response.status}`);
            }

            const data = await response.json();
            return data.response;
        } catch (error) {
            console.error('Claude API Error:', error);

            // Return a fallback response
            return this.getFallbackResponse(messages[messages.length - 1]?.content || '');
        }
    }

    /**
     * Get a fallback response when API fails
     */
    getFallbackResponse(userMessage) {
        const fallbackResponses = [
            "Ah, the island breeze must have scrambled my thoughts! Could you say that again, friend? 🌴",
            "Hmm, the coconuts are interfering with my thinking today. Let me ponder that one... 🥥",
            "The waves are a bit loud right now! But I'm always happy to chat. What's on your mind?",
            "My tropical brain needs a moment - the sun is particularly bright today! ☀️",
            "Interesting question! The ocean seems to have washed away my answer. Care to try again?",
        ];

        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }

    /**
     * Add a message to conversation history
     */
    addToHistory(role, content) {
        const message = {
            role,
            content,
            timestamp: new Date().toISOString()
        };

        this.conversationHistory.push(message);

        // Trim history if too long
        if (this.conversationHistory.length > CONFIG.UI.maxHistoryMessages) {
            this.conversationHistory = this.conversationHistory.slice(-CONFIG.UI.maxHistoryMessages);
        }

        // Save to localStorage
        this.saveHistory();

        // Update UI
        this.renderHistoryMessage(message);
    }

    /**
     * Render a message in the history panel
     */
    renderHistoryMessage(message) {
        if (!this.historyContent) return;

        const messageEl = document.createElement('div');
        messageEl.className = `chat-message ${message.role}`;

        const icon = message.role === 'user' ? '👤' : '🏝️';
        const label = message.role === 'user' ? 'You' : 'Island Friend';

        messageEl.innerHTML = `
            <div class="message-header">
                <span>${icon}</span>
                <span>${label}</span>
            </div>
            <div class="message-content">${this.escapeHtml(message.content)}</div>
        `;

        this.historyContent.appendChild(messageEl);

        // Auto-scroll
        if (CONFIG.UI.autoScrollChat) {
            this.historyContent.scrollTop = this.historyContent.scrollHeight;
        }
    }

    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
        this.saveHistory();

        if (this.historyContent) {
            this.historyContent.innerHTML = '';
        }
    }

    /**
     * Save history to localStorage
     */
    saveHistory() {
        try {
            localStorage.setItem('talkingIslandHistory', JSON.stringify(this.conversationHistory));
        } catch (e) {
            console.warn('Could not save conversation history:', e);
        }
    }

    /**
     * Load history from localStorage
     */
    loadHistory() {
        try {
            const saved = localStorage.getItem('talkingIslandHistory');
            if (saved) {
                this.conversationHistory = JSON.parse(saved);

                // Render existing history
                this.conversationHistory.forEach(msg => this.renderHistoryMessage(msg));
            }
        } catch (e) {
            console.warn('Could not load conversation history:', e);
            this.conversationHistory = [];
        }
    }

    /**
     * Get conversation context for API
     */
    getContext() {
        return this.conversationHistory.slice(-10); // Last 10 messages for context
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for use in other modules
window.ConversationController = ConversationController;
