/**
 * HeyGen Streaming Avatar Controller
 * Manages the interactive avatar with lip-sync capabilities
 */

class HeyGenController {
    constructor() {
        this.sessionId = null;
        this.accessToken = null;
        this.peerConnection = null;
        this.dataChannel = null;
        this.videoElement = null;
        this.isConnected = false;
        this.isInitializing = false;
        
        // Callbacks
        this.onConnected = null;
        this.onDisconnected = null;
        this.onSpeakingStart = null;
        this.onSpeakingEnd = null;
        this.onError = null;
        
        this.init();
    }
    
    init() {
        // Get video element
        this.videoElement = document.getElementById('avatarVideo');
        
        if (!this.videoElement) {
            console.warn('Avatar video element not found. Creating one...');
            this.createVideoElement();
        }
    }
    
    /**
     * Create video element if not present in DOM
     */
    createVideoElement() {
        const characterArea = document.querySelector('.character-area') || 
                             document.querySelector('.character-wrapper') ||
                             document.querySelector('.center-section');
        
        if (characterArea) {
            this.videoElement = document.createElement('video');
            this.videoElement.id = 'avatarVideo';
            this.videoElement.className = 'avatar-video';
            this.videoElement.autoplay = true;
            this.videoElement.playsInline = true;
            this.videoElement.muted = false; // We want audio
            characterArea.appendChild(this.videoElement);
        }
    }
    
    /**
     * Initialize HeyGen streaming session
     */
    async createSession(avatarId = null, quality = 'medium') {
        if (this.isInitializing) {
            console.log('Session already initializing...');
            return;
        }
        
        this.isInitializing = true;
        
        try {
            console.log('Creating HeyGen session...');
            
            const response = await fetch(`${CONFIG.API.BASE_URL}/heygen/create-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    avatarId: avatarId || CONFIG.HEYGEN?.avatarId,
                    quality: quality
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create session');
            }
            
            const data = await response.json();
            
            this.sessionId = data.session_id;
            this.accessToken = data.access_token;
            
            console.log('HeyGen session created:', this.sessionId);
            
            // Setup WebRTC connection
            await this.setupWebRTC(data.url);
            
            this.isConnected = true;
            this.isInitializing = false;
            
            if (this.onConnected) {
                this.onConnected();
            }
            
            return this.sessionId;
            
        } catch (error) {
            console.error('Failed to create HeyGen session:', error);
            this.isInitializing = false;
            
            if (this.onError) {
                this.onError(error);
            }
            
            throw error;
        }
    }
    
    /**
     * Setup WebRTC connection for streaming video
     */
    async setupWebRTC(url) {
        try {
            // Create RTCPeerConnection
            this.peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            });
            
            // Handle incoming tracks (video/audio from avatar)
            this.peerConnection.ontrack = (event) => {
                console.log('Received track:', event.track.kind);
                
                if (event.streams && event.streams[0]) {
                    this.videoElement.srcObject = event.streams[0];
                    this.videoElement.play().catch(e => {
                        console.error('Video play error:', e);
                    });
                }
            };
            
            // Handle ICE candidates
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    console.log('ICE candidate:', event.candidate);
                }
            };
            
            // Handle connection state changes
            this.peerConnection.onconnectionstatechange = () => {
                console.log('Connection state:', this.peerConnection.connectionState);
                
                if (this.peerConnection.connectionState === 'disconnected' ||
                    this.peerConnection.connectionState === 'failed') {
                    this.handleDisconnection();
                }
            };
            
            // Create data channel for communication
            this.dataChannel = this.peerConnection.createDataChannel('heygen');
            
            this.dataChannel.onopen = () => {
                console.log('Data channel opened');
            };
            
            this.dataChannel.onmessage = (event) => {
                this.handleDataChannelMessage(event.data);
            };
            
            // Note: In production, you'd exchange SDP offers/answers with HeyGen's signaling server
            // This is a simplified version - HeyGen provides the actual WebRTC setup via their SDK
            
            console.log('WebRTC setup complete');
            
        } catch (error) {
            console.error('WebRTC setup failed:', error);
            throw error;
        }
    }
    
    /**
     * Handle messages from data channel
     */
    handleDataChannelMessage(data) {
        try {
            const message = JSON.parse(data);
            
            switch (message.type) {
                case 'speaking_start':
                    if (this.onSpeakingStart) {
                        this.onSpeakingStart();
                    }
                    break;
                    
                case 'speaking_end':
                    if (this.onSpeakingEnd) {
                        this.onSpeakingEnd();
                    }
                    break;
                    
                case 'error':
                    console.error('HeyGen error:', message.error);
                    if (this.onError) {
                        this.onError(new Error(message.error));
                    }
                    break;
                    
                default:
                    console.log('HeyGen message:', message);
            }
            
        } catch (e) {
            console.log('Data channel message:', data);
        }
    }
    
    /**
     * Make the avatar speak text
     */
    async speak(text) {
        if (!this.isConnected || !this.sessionId) {
            console.warn('HeyGen not connected. Using fallback TTS.');
            return false;
        }
        
        try {
            console.log('Making avatar speak:', text.substring(0, 50) + '...');
            
            const response = await fetch(`${CONFIG.API.BASE_URL}/heygen/speak`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.sessionId,
                    text: text,
                    taskType: 'talk'
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to speak');
            }
            
            const data = await response.json();
            console.log('Speak task created:', data.task_id);
            
            // Trigger speaking start callback
            if (this.onSpeakingStart) {
                this.onSpeakingStart();
            }
            
            return true;
            
        } catch (error) {
            console.error('HeyGen speak error:', error);
            
            if (this.onError) {
                this.onError(error);
            }
            
            return false;
        }
    }
    
    /**
     * Handle disconnection
     */
    handleDisconnection() {
        this.isConnected = false;
        
        if (this.onDisconnected) {
            this.onDisconnected();
        }
    }
    
    /**
     * Close the streaming session
     */
    async closeSession() {
        if (!this.sessionId) {
            return;
        }
        
        try {
            console.log('Closing HeyGen session...');
            
            await fetch(`${CONFIG.API.BASE_URL}/heygen/close-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    sessionId: this.sessionId
                })
            });
            
            // Cleanup
            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }
            
            if (this.videoElement) {
                this.videoElement.srcObject = null;
            }
            
            this.sessionId = null;
            this.accessToken = null;
            this.isConnected = false;
            
            console.log('HeyGen session closed');
            
        } catch (error) {
            console.error('Error closing HeyGen session:', error);
        }
    }
    
    /**
     * Check if avatar is available and connected
     */
    isAvailable() {
        return this.isConnected && this.sessionId !== null;
    }
    
    /**
     * Get list of available avatars
     */
    async getAvatars() {
        try {
            const response = await fetch(`${CONFIG.API.BASE_URL}/heygen/avatars`);
            
            if (!response.ok) {
                throw new Error('Failed to get avatars');
            }
            
            const data = await response.json();
            return data.avatars || [];
            
        } catch (error) {
            console.error('Error getting avatars:', error);
            return [];
        }
    }
    
    /**
     * Show/hide video element
     */
    showVideo(show = true) {
        if (this.videoElement) {
            this.videoElement.style.display = show ? 'block' : 'none';
        }
    }
    
    /**
     * Set video element styles
     */
    setVideoStyles(styles) {
        if (this.videoElement) {
            Object.assign(this.videoElement.style, styles);
        }
    }
}

// Export for use in other modules
window.HeyGenController = HeyGenController;
