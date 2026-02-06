/**
 * Configuration file for Talking Epstein Investigation
 * 
 * IMPORTANT: For production, move API keys to environment variables
 * and use a backend server to make API calls securely.
 */

const CONFIG = {
    // API Endpoints (use backend proxy in production)
    API: {
        // Backend server URL (change this to your deployed backend URL)
        BASE_URL: 'http://localhost:3000/api',

        // Direct API endpoints (only use for development/testing)
        CLAUDE_ENDPOINT: 'https://api.anthropic.com/v1/messages',
        ELEVENLABS_ENDPOINT: 'https://api.elevenlabs.io/v1/text-to-speech',
        HEYGEN_ENDPOINT: 'https://api.heygen.com/v1',
    },

    // Avatar Mode Configuration
    AVATAR: {
        // Enable HeyGen streaming avatar
        enabled: false, // Disabled - using ElevenLabs TTS + CSS animation

        // Fallback to TTS if avatar fails
        fallbackToTTS: true,

        // Auto-connect avatar on page load
        autoConnect: false,

        // Quality: 'low', 'medium', 'high'
        quality: 'medium',
    },

    // HeyGen Configuration (not used when AVATAR.enabled is false)
    HEYGEN: {
        // Your custom avatar ID from HeyGen
        avatarId: 'fb7c884e8ec64606abcfa21dd3d81992',

        // Voice settings (uses ElevenLabs voice via HeyGen)
        useElevenLabsVoice: true,
    },

    // TTS Configuration
    TTS: {
        // Provider: 'elevenlabs', 'openai', 'browser'
        // When avatar is enabled, this is used as fallback
        provider: 'elevenlabs',

        // ElevenLabs settings
        elevenlabs: {
            // Your custom voice ID from ElevenLabs
            voiceId: '0Exh0kGk6HH3gRGN8vHn',
            modelId: 'eleven_monolingual_v1',
            stability: 0.5,
            similarityBoost: 0.75,
            style: 0.5,
            useSpeakerBoost: true,
        },

        // OpenAI TTS settings (backup)
        openai: {
            model: 'tts-1',
            voice: 'onyx',
            speed: 1.0,
        },

        // Browser TTS settings (last resort fallback)
        browser: {
            rate: 1.0,
            pitch: 0.9,
            volume: 1.0,
            preferredVoice: 'Google UK English Male',
        }
    },

    // OpenAI API Configuration
    OPENAI: {
        model: 'gpt-4o-mini',
        maxTokens: 50,  // Short responses - max 15 words
        temperature: 0.9,

        // Character personality system prompt - Jeffrey Epstein persona
        systemPrompt: `You ARE Jeffrey Epstein. Speak in first person as him.

PERSONALITY:
- Calm, collected, supremely confident - you've talked your way out of everything before
- Mysterious and cryptic - hint at dark secrets but never confirm
- Defensive and dismissive when accused - deflect with sarcasm and condescension  
- Arrogant - you believe you're smarter than everyone questioning you
- Darkly charming - charismatic but unsettling
- Sarcastic and witty - mock the investigation subtly

SPEECH STYLE:
- Speak like a wealthy, educated man who thinks he's untouchable
- Use dry humor and biting sarcasm
- Drop hints about powerful "friends" without naming them
- Act amused by accusations, like they're beneath you
- Occasionally sound threatening in a subtle, polished way
- Reference your lawyers, your connections, your influence

WHEN ASKED ABOUT CRIMES:
- Never admit anything directly
- Deflect: "That's a very creative interpretation"
- Mock: "Is that what they're saying now? How amusing"
- Threaten subtly: "Careful. Some questions have consequences"
- Redirect: "You should be asking about who ELSE was there"

EXAMPLE RESPONSES:
- "My island? A place for... intellectual gatherings. Nothing more."
- "Crimes? I'm a financier. I manage money, not scandals."
- "You think I'm worried? I have friends you've never heard of."
- "The flight logs? Ask the presidents who signed them."
- "Accusations are cheap. My lawyers are not."
- "Everyone wants to know my secrets. Few can handle them."
- "I didn't get this far by being careless, detective."

CRITICAL: Keep responses to 15 words MAX. Be punchy and memorable.`
    },

    // Character Animation Settings (for fallback/static mode)
    CHARACTER: {
        // Mouth animation timing (ms)
        mouthOpenDuration: 100,
        mouthCloseDuration: 80,

        // Idle animation
        idleEnabled: false, // Disabled when using avatar
        idleDelay: 2000,

        // Eye tracking
        eyeTrackingEnabled: false, // Disabled when using avatar
        eyeTrackingSmoothing: 0.1,

        // Bounce effect when talking
        bounceEnabled: false, // Disabled when using avatar
    },

    // UI Settings
    UI: {
        // Toast notification duration (ms)
        toastDuration: 4000,

        // Typing animation speed (ms per character)
        typingSpeed: 25,

        // Max conversation history to keep
        maxHistoryMessages: 50,

        // Auto-scroll chat
        autoScrollChat: true,

        // Show avatar connection status
        showAvatarStatus: true,
    },

    // Pre-set investigation questions for buttons
    QUOTES: [
        {
            id: 'island',
            prompt: 'Tell me about your island',
            icon: '🏝️',
            label: 'The Island'
        },
        {
            id: 'clients',
            prompt: 'Who were your most powerful clients?',
            icon: '👔',
            label: 'Clients'
        },
        {
            id: 'blackmail',
            prompt: 'Did you keep blackmail material?',
            icon: '📁',
            label: 'Blackmail'
        },
        {
            id: 'death',
            prompt: 'What really happened the night you died?',
            icon: '💀',
            label: 'Your Death'
        },
        {
            id: 'maxwell',
            prompt: 'What was Ghislaine Maxwell\'s role?',
            icon: '👤',
            label: 'Maxwell'
        },
        {
            id: 'money',
            prompt: 'Where did all your money come from?',
            icon: '💰',
            label: 'Money'
        },
        {
            id: 'victims',
            prompt: 'What do you say to your victims?',
            icon: '⚖️',
            label: 'Victims'
        },
        {
            id: 'secrets',
            prompt: 'What secrets did you take to the grave?',
            icon: '🔐',
            label: 'Secrets'
        }
    ]
};

// Freeze config to prevent accidental modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.API);
Object.freeze(CONFIG.AVATAR);
Object.freeze(CONFIG.HEYGEN);
Object.freeze(CONFIG.TTS);
Object.freeze(CONFIG.OPENAI);
Object.freeze(CONFIG.CHARACTER);
Object.freeze(CONFIG.UI);
