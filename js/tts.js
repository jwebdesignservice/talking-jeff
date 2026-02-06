/**
 * Text-to-Speech Controller
 * Supports multiple TTS providers: ElevenLabs, OpenAI, Browser
 */

class TTSController {
    constructor() {
        this.audioPlayer = document.getElementById('audioPlayer');
        this.currentProvider = CONFIG.TTS.provider;
        this.isPlaying = false;
        this.speechSynthesis = window.speechSynthesis;
        this.currentUtterance = null;
        this.audioQueue = [];
        
        this.init();
    }
    
    init() {
        // Setup audio player events
        this.audioPlayer.addEventListener('play', () => this.onAudioStart());
        this.audioPlayer.addEventListener('ended', () => this.onAudioEnd());
        this.audioPlayer.addEventListener('error', (e) => this.onAudioError(e));
        
        // Load browser voices
        if (this.speechSynthesis) {
            this.loadBrowserVoices();
        }
    }
    
    /**
     * Load available browser voices
     */
    loadBrowserVoices() {
        // Voices may not be immediately available
        if (this.speechSynthesis.getVoices().length === 0) {
            this.speechSynthesis.addEventListener('voiceschanged', () => {
                this.browserVoices = this.speechSynthesis.getVoices();
            });
        } else {
            this.browserVoices = this.speechSynthesis.getVoices();
        }
    }
    
    /**
     * Main speak function - routes to appropriate provider
     * @param {string} text - Text to speak
     * @param {Function} onStart - Callback when speech starts
     * @param {Function} onEnd - Callback when speech ends
     */
    async speak(text, onStart, onEnd) {
        this.onStartCallback = onStart;
        this.onEndCallback = onEnd;
        
        // Clean text for TTS
        const cleanText = this.cleanTextForTTS(text);
        
        try {
            switch (this.currentProvider) {
                case 'elevenlabs':
                    await this.speakWithElevenLabs(cleanText);
                    break;
                case 'openai':
                    await this.speakWithOpenAI(cleanText);
                    break;
                case 'browser':
                default:
                    await this.speakWithBrowser(cleanText);
                    break;
            }
        } catch (error) {
            console.error('TTS Error:', error);
            // Fallback to browser TTS
            if (this.currentProvider !== 'browser') {
                console.log('Falling back to browser TTS');
                await this.speakWithBrowser(cleanText);
            } else {
                this.onAudioError(error);
            }
        }
    }
    
    /**
     * Clean text for TTS (remove emojis, special chars, etc.)
     */
    cleanTextForTTS(text) {
        // Remove emojis but keep basic punctuation
        return text
            .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
            .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Misc Symbols
            .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport
            .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
            .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Misc symbols
            .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
            .replace(/\s+/g, ' ')
            .trim();
    }
    
    /**
     * Speak using ElevenLabs API
     */
    async speakWithElevenLabs(text) {
        const settings = CONFIG.TTS.elevenlabs;
        
        // Use backend proxy for security
        const response = await fetch(`${CONFIG.API.BASE_URL}/tts/elevenlabs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                voiceId: settings.voiceId,
                modelId: settings.modelId,
                voiceSettings: {
                    stability: settings.stability,
                    similarity_boost: settings.similarityBoost,
                    style: settings.style,
                    use_speaker_boost: settings.useSpeakerBoost,
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`ElevenLabs API error: ${response.status}`);
        }
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        this.playAudio(audioUrl);
    }
    
    /**
     * Speak using OpenAI TTS API
     */
    async speakWithOpenAI(text) {
        const settings = CONFIG.TTS.openai;
        
        // Use backend proxy for security
        const response = await fetch(`${CONFIG.API.BASE_URL}/tts/openai`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: settings.model,
                input: text,
                voice: settings.voice,
                speed: settings.speed,
            })
        });
        
        if (!response.ok) {
            throw new Error(`OpenAI TTS API error: ${response.status}`);
        }
        
        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        
        this.playAudio(audioUrl);
    }
    
    /**
     * Speak using browser's built-in TTS
     */
    async speakWithBrowser(text) {
        return new Promise((resolve, reject) => {
            if (!this.speechSynthesis) {
                reject(new Error('Speech synthesis not supported'));
                return;
            }
            
            // Cancel any ongoing speech
            this.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            this.currentUtterance = utterance;
            
            // Apply settings
            const settings = CONFIG.TTS.browser;
            utterance.rate = settings.rate;
            utterance.pitch = settings.pitch;
            utterance.volume = settings.volume;
            
            // Try to find preferred voice
            const voices = this.speechSynthesis.getVoices();
            const preferredVoice = voices.find(v => 
                v.name.includes(settings.preferredVoice) || 
                v.name.includes('English')
            );
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
            
            utterance.onstart = () => {
                this.isPlaying = true;
                if (this.onStartCallback) this.onStartCallback();
            };
            
            utterance.onend = () => {
                this.isPlaying = false;
                this.currentUtterance = null;
                if (this.onEndCallback) this.onEndCallback();
                resolve();
            };
            
            utterance.onerror = (event) => {
                this.isPlaying = false;
                this.currentUtterance = null;
                if (event.error !== 'canceled') {
                    reject(new Error(`Speech synthesis error: ${event.error}`));
                }
            };
            
            this.speechSynthesis.speak(utterance);
        });
    }
    
    /**
     * Play audio from URL
     */
    playAudio(url) {
        this.audioPlayer.src = url;
        this.audioPlayer.play().catch(e => {
            console.error('Audio playback error:', e);
            this.onAudioError(e);
        });
    }
    
    /**
     * Stop current speech
     */
    stop() {
        // Stop audio player
        if (this.audioPlayer) {
            this.audioPlayer.pause();
            this.audioPlayer.currentTime = 0;
        }
        
        // Stop browser TTS
        if (this.speechSynthesis) {
            this.speechSynthesis.cancel();
        }
        
        this.isPlaying = false;
        this.currentUtterance = null;
        
        if (this.onEndCallback) {
            this.onEndCallback();
        }
    }
    
    /**
     * Pause current speech
     */
    pause() {
        if (this.audioPlayer && !this.audioPlayer.paused) {
            this.audioPlayer.pause();
        }
        if (this.speechSynthesis) {
            this.speechSynthesis.pause();
        }
    }
    
    /**
     * Resume paused speech
     */
    resume() {
        if (this.audioPlayer && this.audioPlayer.paused) {
            this.audioPlayer.play();
        }
        if (this.speechSynthesis) {
            this.speechSynthesis.resume();
        }
    }
    
    /**
     * Audio start event handler
     */
    onAudioStart() {
        this.isPlaying = true;
        if (this.onStartCallback) {
            this.onStartCallback();
        }
    }
    
    /**
     * Audio end event handler
     */
    onAudioEnd() {
        this.isPlaying = false;
        if (this.onEndCallback) {
            this.onEndCallback();
        }
        
        // Clean up blob URL
        if (this.audioPlayer.src.startsWith('blob:')) {
            URL.revokeObjectURL(this.audioPlayer.src);
        }
    }
    
    /**
     * Audio error handler
     */
    onAudioError(error) {
        console.error('Audio error:', error);
        this.isPlaying = false;
        if (this.onEndCallback) {
            this.onEndCallback();
        }
    }
    
    /**
     * Set TTS provider
     * @param {string} provider - 'elevenlabs', 'openai', or 'browser'
     */
    setProvider(provider) {
        if (['elevenlabs', 'openai', 'browser'].includes(provider)) {
            this.currentProvider = provider;
            console.log(`TTS provider set to: ${provider}`);
        }
    }
    
    /**
     * Get available browser voices
     */
    getAvailableVoices() {
        return this.speechSynthesis ? this.speechSynthesis.getVoices() : [];
    }
    
    /**
     * Test TTS with a sample phrase
     */
    async test() {
        await this.speak(
            "Hello! I'm your tropical island friend. Nice to meet you!",
            () => console.log('TTS started'),
            () => console.log('TTS ended')
        );
    }
}

// Export for use in other modules
window.TTSController = TTSController;
