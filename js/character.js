/**
 * Character Animation Controller
 * Handles all character animations including video sync with audio
 */

class CharacterController {
    constructor() {
        this.character = document.getElementById('character');
        this.characterContainer = document.getElementById('characterContainer');
        this.characterStatic = document.getElementById('characterStatic');
        this.characterVideo = document.getElementById('characterVideo');
        this.mouth = document.getElementById('characterMouth');
        this.speechBubble = document.getElementById('speechBubble');
        this.speechContent = document.getElementById('speechContent');
        this.loadingIndicator = document.getElementById('loadingIndicator');

        this.isTalking = false;
        this.isIdle = true;
        this.mouthAnimationInterval = null;
        this.idleTimeout = null;
        this.audioContext = null;
        this.analyser = null;
        this.hasVideo = false;

        this.init();
    }

    init() {
        // Start idle animation
        this.startIdleAnimation();

        // Setup eye tracking
        if (CONFIG.CHARACTER.eyeTrackingEnabled) {
            this.setupEyeTracking();
        }

        // Add click interaction
        if (this.character) {
            this.character.addEventListener('click', () => this.onCharacterClick());
        }

        // Initialize audio context on first user interaction
        document.addEventListener('click', () => this.initAudioContext(), { once: true });
    }

    initAudioContext() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
        }
    }

    /**
     * Setup eye tracking to follow cursor
     */
    setupEyeTracking() {
        const pupils = document.querySelectorAll('.pupil');

        document.addEventListener('mousemove', (e) => {
            if (this.isTalking) return;

            pupils.forEach(pupil => {
                const eye = pupil.parentElement;
                const eyeRect = eye.getBoundingClientRect();
                const eyeCenterX = eyeRect.left + eyeRect.width / 2;
                const eyeCenterY = eyeRect.top + eyeRect.height / 2;

                const angle = Math.atan2(e.clientY - eyeCenterY, e.clientX - eyeCenterX);
                const distance = Math.min(8, Math.hypot(e.clientX - eyeCenterX, e.clientY - eyeCenterY) * 0.02);

                const x = Math.cos(angle) * distance;
                const y = Math.sin(angle) * distance;

                pupil.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
            });
        });
    }

    /**
     * Start idle animation
     */
    startIdleAnimation() {
        if (!CONFIG.CHARACTER.idleEnabled) return;

        this.isIdle = true;
        if (this.character) {
            this.character.classList.add('idle');
            this.character.classList.remove('talking');
        }
    }

    /**
     * Stop idle animation
     */
    stopIdleAnimation() {
        this.isIdle = false;
        if (this.character) {
            this.character.classList.remove('idle');
        }

        // Clear any pending idle timeout
        if (this.idleTimeout) {
            clearTimeout(this.idleTimeout);
            this.idleTimeout = null;
        }
    }

    /**
     * Start talking - plays the HeyGen video overlay
     * Called when ElevenLabs audio starts
     */
    startTalking() {
        this.stopIdleAnimation();
        this.isTalking = true;

        console.log('🎬 START TALKING - Playing video...');

        // Add talking class - CSS will show video and hide static image
        if (this.character) {
            this.character.classList.add('talking');
        }

        // Play the video from the beginning
        if (this.characterVideo) {
            this.characterVideo.currentTime = 0;
            this.characterVideo.play().then(() => {
                console.log('✅ Video playing!');
            }).catch(e => {
                console.error('❌ Video play failed:', e);
            });
        }
    }

    /**
     * Stop talking - pauses the HeyGen video
     * Called when ElevenLabs audio ends
     */
    stopTalking() {
        this.isTalking = false;

        console.log('🎬 STOP TALKING - Pausing video...');

        // Remove talking class - CSS will hide video and show static image
        if (this.character) {
            this.character.classList.remove('talking');
        }

        // Pause the video
        if (this.characterVideo) {
            this.characterVideo.pause();
            console.log('✅ Video paused!');
        }

        // Resume idle animation after delay
        this.idleTimeout = setTimeout(() => {
            this.startIdleAnimation();
        }, CONFIG.CHARACTER.idleDelay);
    }


    /**
     * Start mouth animation loop
     */
    startMouthAnimation() {
        if (this.mouthAnimationInterval) return;

        const animate = () => {
            if (!this.isTalking || !this.mouth) return;

            // Random mouth movement for natural look
            const openDuration = CONFIG.CHARACTER.mouthOpenDuration + Math.random() * 50;
            const closeDuration = CONFIG.CHARACTER.mouthCloseDuration + Math.random() * 30;

            this.mouth.style.height = '30px';
            this.mouth.style.borderRadius = '10px 10px 25px 25px';

            setTimeout(() => {
                if (!this.isTalking || !this.mouth) return;
                this.mouth.style.height = '18px';
                this.mouth.style.borderRadius = '0 0 25px 25px';
            }, openDuration);

            this.mouthAnimationInterval = setTimeout(animate, openDuration + closeDuration);
        };

        animate();
    }

    /**
     * Stop mouth animation
     */
    stopMouthAnimation() {
        if (this.mouthAnimationInterval) {
            clearTimeout(this.mouthAnimationInterval);
            this.mouthAnimationInterval = null;
        }

        // Reset mouth to closed position
        if (this.mouth) {
            this.mouth.style.height = '18px';
            this.mouth.style.borderRadius = '0 0 25px 25px';
        }
    }

    /**
     * Update speech bubble text
     * @param {string} text - Text to display
     * @param {boolean} animate - Whether to animate the text
     */
    async updateSpeechBubble(text, animate = true) {
        if (!this.speechContent) return;

        if (animate) {
            await this.typeText(text);
        } else {
            this.speechContent.innerHTML = `<p>${text}</p>`;
        }
    }

    /**
     * Animate text typing effect
     * @param {string} text - Text to type
     */
    async typeText(text) {
        if (!this.speechContent) return;

        this.speechContent.innerHTML = '<p></p>';
        const p = this.speechContent.querySelector('p');

        for (let i = 0; i < text.length; i++) {
            p.textContent += text[i];
            await this.sleep(CONFIG.UI.typingSpeed);
        }
    }

    /**
     * Show loading state
     */
    showLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.add('active');
        }
        if (this.speechBubble) {
            this.speechBubble.style.opacity = '0.5';
        }
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        if (this.loadingIndicator) {
            this.loadingIndicator.classList.remove('active');
        }
        if (this.speechBubble) {
            this.speechBubble.style.opacity = '1';
        }
    }

    /**
     * Character click reaction
     */
    onCharacterClick() {
        // Add a bounce effect
        if (this.character) {
            this.character.style.animation = 'none';
            this.character.offsetHeight; // Trigger reflow
            this.character.style.animation = 'characterBounce 0.5s ease';
        }

        // Random reaction
        const reactions = [
            "Hey there! 👋",
            "That tickles! 😄",
            "Oh, hello friend!",
            "You found me! 🌴",
            "Aloha! 🌊"
        ];

        const reaction = reactions[Math.floor(Math.random() * reactions.length)];
        this.updateSpeechBubble(reaction, false);
    }

    /**
     * Utility sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Add additional keyframe animations dynamically
const styleSheet = document.createElement('style');
styleSheet.textContent = `
    @keyframes characterBounce {
        0%, 100% { transform: scale(1); }
        25% { transform: scale(1.1) rotate(-3deg); }
        50% { transform: scale(0.95) rotate(3deg); }
        75% { transform: scale(1.05) rotate(-1deg); }
    }
`;
document.head.appendChild(styleSheet);

// Export for use in other modules
window.CharacterController = CharacterController;
