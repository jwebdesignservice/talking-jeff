/**
 * Talking Jeff - Investigation AI
 * Main Application Controller
 * 
 * Integrates: Claude AI + ElevenLabs TTS + HeyGen Avatar
 */

class TalkingInvestigationApp {
    constructor() {
        this.character = new CharacterController();
        this.tts = new TTSController();
        this.conversation = new ConversationController();
        this.heygen = null; // Will be initialized if avatar is enabled

        // State
        this.useAvatar = CONFIG.AVATAR.enabled;
        this.avatarConnected = false;
        this.isProcessing = false;

        // DOM Elements
        this.userInput = document.getElementById('userInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.micBtn = document.querySelector('.mic-btn');
        this.voiceInputBtn = document.getElementById('voiceInputBtn');
        this.stopSpeechBtn = document.getElementById('stopSpeechBtn');
        this.clearChatBtn = document.getElementById('clearChatBtn');
        this.historyToggle = document.getElementById('historyToggle');
        this.historyContent = document.getElementById('historyContent');
        this.toastContainer = document.getElementById('toastContainer');
        this.ctaButton = document.getElementById('ctaButton');
        this.avatarStatus = document.getElementById('avatarStatus');

        this.quoteButtons = document.querySelectorAll('.strip-btn[data-quote]');

        this.recognition = null;
        this.isRecording = false;

        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupSpeechRecognition();
        this.showWelcomeMessage();

        // Initialize HeyGen avatar if enabled
        if (this.useAvatar) {
            await this.initializeAvatar();
            this.setupAvatarStatusClick();
        }

        // Set TTS provider
        this.tts.setProvider(CONFIG.TTS.provider);

        console.log('🔍 Investigation AI initialized');
        console.log('💡 Click the avatar status button (bottom right) to enable lip-sync!');
    }

    /**
     * Initialize HeyGen streaming avatar
     */
    async initializeAvatar() {
        try {
            this.heygen = new HeyGenController();

            // Setup callbacks
            this.heygen.onConnected = () => {
                this.avatarConnected = true;
                this.updateAvatarStatus('connected');
                this.showToast('Avatar connected', 'success');
                console.log('Avatar connected');
            };

            this.heygen.onDisconnected = () => {
                this.avatarConnected = false;
                this.updateAvatarStatus('disconnected');
                this.showToast('Avatar disconnected', 'info');
                console.log('Avatar disconnected');
            };

            this.heygen.onSpeakingStart = () => {
                this.character.startTalking();
            };

            this.heygen.onSpeakingEnd = () => {
                this.character.stopTalking();
                this.setUIDisabled(false);
            };

            this.heygen.onError = (error) => {
                console.error('Avatar error:', error);
                this.showToast('Avatar error - using voice only', 'error');
            };

            // Auto-connect if configured
            if (CONFIG.AVATAR.autoConnect) {
                await this.connectAvatar();
            } else {
                this.updateAvatarStatus('ready');
            }

        } catch (error) {
            console.error('Failed to initialize avatar:', error);
            this.useAvatar = false;
        }
    }

    /**
     * Connect to HeyGen avatar
     */
    async connectAvatar() {
        if (!this.heygen) return;

        try {
            this.updateAvatarStatus('connecting');
            await this.heygen.createSession(
                CONFIG.HEYGEN.avatarId,
                CONFIG.AVATAR.quality
            );
        } catch (error) {
            console.error('Failed to connect avatar:', error);
            this.updateAvatarStatus('error');

            if (CONFIG.AVATAR.fallbackToTTS) {
                this.showToast('Using voice-only mode', 'info');
            }
        }
    }

    /**
     * Update avatar status indicator
     */
    updateAvatarStatus(status) {
        if (!this.avatarStatus && CONFIG.UI.showAvatarStatus) {
            // Create status indicator if it doesn't exist
            const statusEl = document.createElement('div');
            statusEl.id = 'avatarStatus';
            statusEl.className = 'avatar-status';
            statusEl.innerHTML = '<span class="status-dot">●</span><span class="status-text"></span>';
            document.body.appendChild(statusEl);
            this.avatarStatus = statusEl;
        }

        if (this.avatarStatus) {
            this.avatarStatus.className = `avatar-status ${status}`;

            const statusConfig = {
                'ready': { dot: '●', text: 'Click to Connect Avatar', clickable: true },
                'connecting': { dot: '◌', text: 'Connecting...', clickable: false },
                'connected': { dot: '●', text: 'Avatar Live - Lip Sync ON', clickable: false },
                'disconnected': { dot: '○', text: 'Click to Reconnect', clickable: true },
                'error': { dot: '✕', text: 'Error - Click to Retry', clickable: true }
            };

            const config = statusConfig[status] || { dot: '●', text: status, clickable: false };

            const dotEl = this.avatarStatus.querySelector('.status-dot');
            const textEl = this.avatarStatus.querySelector('.status-text');

            if (dotEl) dotEl.textContent = config.dot;
            if (textEl) textEl.textContent = config.text;

            this.avatarStatus.style.cursor = config.clickable ? 'pointer' : 'default';
        }
    }

    /**
     * Setup avatar status click handler
     */
    setupAvatarStatusClick() {
        if (this.avatarStatus) {
            this.avatarStatus.addEventListener('click', async () => {
                // Only connect if not already connected or connecting
                if (!this.avatarConnected && !this.heygen?.isInitializing) {
                    this.showToast('Connecting avatar...', 'info');
                    await this.connectAvatar();
                }
            });
        }
    }

    setupEventListeners() {
        // Send button
        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', () => this.handleSend());
        }

        // Input field - Enter to send
        if (this.userInput) {
            this.userInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSend();
                }
            });
        }

        // Mic button (Press to listen)
        if (this.micBtn) {
            this.micBtn.addEventListener('click', () => this.toggleVoiceInput());
        }

        if (this.voiceInputBtn) {
            this.voiceInputBtn.addEventListener('click', () => this.toggleVoiceInput());
        }

        // Stop speech button
        if (this.stopSpeechBtn) {
            this.stopSpeechBtn.addEventListener('click', () => this.stopSpeech());
        }

        // Clear chat button
        if (this.clearChatBtn) {
            this.clearChatBtn.addEventListener('click', () => this.clearChat());
        }

        // CTA button
        if (this.ctaButton) {
            this.ctaButton.addEventListener('click', () => {
                window.open('#', '_blank');
                this.showToast('Opening files...', 'info');
            });
        }

        // Quote/preset buttons
        this.quoteButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const quote = btn.dataset.quote;
                if (quote) this.handleQuote(quote);
            });
        });

        // Copy contract address
        const copyBtn = document.querySelector('.copy-btn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                const ca = document.getElementById('contractAddress')?.textContent;
                if (ca && ca !== '0x...' && ca !== 'CLASSIFIED') {
                    navigator.clipboard.writeText(ca).then(() => {
                        this.showToast('File ID copied!', 'success');
                    });
                } else {
                    this.showToast('Access restricted...', 'info');
                }
            });
        }

        // Avatar connect button (if exists)
        const connectAvatarBtn = document.getElementById('connectAvatarBtn');
        if (connectAvatarBtn) {
            connectAvatarBtn.addEventListener('click', () => this.connectAvatar());
        }

        // Handle page unload - cleanup avatar session
        window.addEventListener('beforeunload', () => {
            if (this.heygen) {
                this.heygen.closeSession();
            }
        });
    }

    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (SpeechRecognition) {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;
            this.recognition.lang = 'en-US';

            this.recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');

                if (this.userInput) {
                    this.userInput.value = transcript;
                }

                if (event.results[event.results.length - 1].isFinal) {
                    this.stopVoiceInput();
                    this.handleSend();
                }
            };

            this.recognition.onerror = (event) => {
                console.error('Speech error:', event.error);
                this.stopVoiceInput();
                this.showToast('Voice input failed', 'error');
            };

            this.recognition.onend = () => this.stopVoiceInput();
        } else {
            // Hide voice input buttons if not supported
            if (this.voiceInputBtn) this.voiceInputBtn.style.display = 'none';
            if (this.micBtn) this.micBtn.style.display = 'none';
        }
    }

    showWelcomeMessage() {
        const messages = [
            "You want to talk? Fine. But be careful what you ask... some questions have dangerous answers.",
            "Another interrogator. How original. What do you want to know?",
            "The cameras are off, right? Good. Ask your questions. But remember - I have friends everywhere.",
            "You think you can get me to talk? Many have tried. Few have succeeded.",
        ];

        const message = messages[Math.floor(Math.random() * messages.length)];
        this.character.updateSpeechBubble(message, false);
    }

    async handleSend() {
        const message = this.userInput?.value.trim();

        if (!message) {
            this.showToast('Type something first', 'info');
            return;
        }

        if (this.isProcessing) {
            this.showToast('Processing...', 'info');
            return;
        }

        if (this.userInput) {
            this.userInput.value = '';
        }

        await this.processMessage(message);
    }

    async handleQuote(quote) {
        if (this.isProcessing) {
            this.showToast('Processing...', 'info');
            return;
        }
        await this.processMessage(quote);
    }

    /**
     * Main conversation flow
     * 1. Send message to Claude AI
     * 2. Get response
     * 3. Either use HeyGen avatar OR ElevenLabs TTS + character animation
     */
    async processMessage(message) {
        this.isProcessing = true;

        try {
            this.character.showLoading();
            this.setUIDisabled(true);

            // Get AI response
            const response = await this.conversation.sendMessage(message);

            this.character.hideLoading();

            // Update speech bubble with response
            await this.character.updateSpeechBubble(response, true);

            // Speak the response
            await this.speakResponse(response);

        } catch (error) {
            console.error('Error:', error);
            this.character.hideLoading();
            this.setUIDisabled(false);
            this.showToast('Transmission failed', 'error');
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Speak response using avatar or TTS
     */
    async speakResponse(text) {
        // Try HeyGen avatar first if connected
        if (this.useAvatar && this.heygen && this.heygen.isAvailable()) {
            const success = await this.heygen.speak(text);

            if (success) {
                // Avatar will handle speaking - callbacks will manage UI state
                return;
            }

            // Fall through to TTS if avatar fails
            console.log('Avatar speak failed, falling back to TTS');
        }

        // Use TTS (ElevenLabs or fallback)
        this.tts.speak(
            text,
            () => {
                // On start
                this.character.startTalking();
                if (this.stopSpeechBtn) this.stopSpeechBtn.disabled = false;
            },
            () => {
                // On end
                this.character.stopTalking();
                if (this.stopSpeechBtn) this.stopSpeechBtn.disabled = true;
                this.setUIDisabled(false);
            }
        );
    }

    stopSpeech() {
        // Stop TTS
        this.tts.stop();

        // Stop character animation
        this.character.stopTalking();

        if (this.stopSpeechBtn) this.stopSpeechBtn.disabled = true;
        this.setUIDisabled(false);
    }

    toggleVoiceInput() {
        if (this.isRecording) {
            this.stopVoiceInput();
        } else {
            this.startVoiceInput();
        }
    }

    startVoiceInput() {
        if (!this.recognition) {
            this.showToast('Voice not supported', 'error');
            return;
        }

        try {
            this.recognition.start();
            this.isRecording = true;

            if (this.voiceInputBtn) this.voiceInputBtn.classList.add('recording');
            if (this.micBtn) this.micBtn.classList.add('recording');
            if (this.userInput) this.userInput.placeholder = 'Listening...';

        } catch (e) {
            console.error('Voice error:', e);
        }
    }

    stopVoiceInput() {
        if (this.recognition && this.isRecording) {
            this.recognition.stop();
        }

        this.isRecording = false;

        if (this.voiceInputBtn) this.voiceInputBtn.classList.remove('recording');
        if (this.micBtn) this.micBtn.classList.remove('recording');
        if (this.userInput) this.userInput.placeholder = 'ENTER QUERY // ACCESS CLASSIFIED DATABASE...';
    }

    clearChat() {
        this.conversation.clearHistory();
        this.showWelcomeMessage();
        this.showToast('History cleared', 'success');
    }

    setUIDisabled(disabled) {
        if (this.sendBtn) this.sendBtn.disabled = disabled;
        if (this.userInput) this.userInput.disabled = disabled;
        if (this.voiceInputBtn) this.voiceInputBtn.disabled = disabled;
        if (this.micBtn) this.micBtn.disabled = disabled;
        this.quoteButtons.forEach(btn => btn.disabled = disabled);
    }

    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toastContainer';
            this.toastContainer.className = 'toast-container';
            document.body.appendChild(this.toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icons = { success: '✓', error: '✕', info: '→' };

        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || '→'}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" onclick="this.parentElement.remove()">×</button>
        `;

        this.toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, CONFIG.UI.toastDuration);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TalkingInvestigationApp();
    
    // Initialize preloader
    initPreloader();
});

/**
 * Investigation Preloader
 * Typewriter effect and loading sequence
 */
function initPreloader() {
    const preloader = document.getElementById('preloader');
    if (!preloader) return;
    
    const typewriterEl = preloader.querySelector('.typewriter-text');
    
    // Investigation-themed loading messages
    const messages = [
        'ACCESSING SECURE FILES...',
        'DECRYPTING EVIDENCE...',
        'LOADING CASE DATA...',
        'VERIFYING CLEARANCE...',
        'SCANNING DOCUMENTS...',
        'CROSS-REFERENCING...',
        'RETRIEVING INTEL...',
        'INITIALIZING SYSTEM...'
    ];
    
    let messageIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let typeSpeed = 80;
    
    function typeMessage() {
        const currentMessage = messages[messageIndex];
        
        if (isDeleting) {
            // Delete characters
            typewriterEl.textContent = currentMessage.substring(0, charIndex - 1);
            charIndex--;
            typeSpeed = 40;
            
            if (charIndex === 0) {
                isDeleting = false;
                messageIndex = (messageIndex + 1) % messages.length;
                typeSpeed = 300; // Pause before typing next
            }
        } else {
            // Type characters
            typewriterEl.textContent = currentMessage.substring(0, charIndex + 1);
            charIndex++;
            typeSpeed = 60 + Math.random() * 60; // Varied speed for realism
            
            if (charIndex === currentMessage.length) {
                isDeleting = true;
                typeSpeed = 1200; // Pause at end of message
            }
        }
        
        // Continue typing if preloader is still visible
        if (!preloader.classList.contains('loaded')) {
            setTimeout(typeMessage, typeSpeed);
        }
    }
    
    // Start typewriter after a short delay
    setTimeout(typeMessage, 500);
    
    // Hide preloader when page is fully loaded
    window.addEventListener('load', function() {
        // Minimum display time for the animation to complete
        const minDisplayTime = 3000;
        const startTime = performance.now();
        
        function hidePreloader() {
            const elapsed = performance.now() - startTime;
            const remainingTime = Math.max(0, minDisplayTime - elapsed);
            
            setTimeout(() => {
                preloader.classList.add('loaded');
                
                // Remove from DOM after transition
                setTimeout(() => {
                    preloader.remove();
                }, 600);
            }, remainingTime);
        }
        
        hidePreloader();
    });
}

// Console branding
console.log(`
%c╔═══════════════════════════════════════════════════╗
║  🔍 CLASSIFIED INVESTIGATION                      ║
║  Interactive AI Interrogation                     ║
║  ─────────────────────────────────────────────── ║
║  Claude AI + ElevenLabs + HeyGen Avatar          ║
╚═══════════════════════════════════════════════════╝
`, 'color: #DC143C; font-family: monospace; font-size: 11px;');
