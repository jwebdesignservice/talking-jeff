/**
 * Backend Server for Talking Epstein Investigation
 * Handles secure API calls to Claude, ElevenLabs, and HeyGen
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false // Allow for WebRTC
}));

// CORS configuration - allow Vercel domains and localhost
app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        
        // Allow all Vercel preview/production URLs
        if (origin.includes('.vercel.app') || origin.includes('.vercel.sh')) {
            return callback(null, true);
        }
        
        // Allow localhost origins for development
        const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
            'http://localhost:8080', 
            'http://127.0.0.1:8080', 
            'http://localhost:5500', 
            'http://127.0.0.1:5500',
            'http://localhost:3000',
            'http://127.0.0.1:3000'
        ];
        
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        // In production/Vercel, be permissive
        if (process.env.VERCEL) {
            return callback(null, true);
        }
        
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));
app.use(express.json({ limit: '10kb' }));

// Rate limiting - Strict limits to prevent credit abuse
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 3, // Only 3 requests per minute to prevent credit abuse
    message: { error: 'Too many requests. Please wait a minute before asking another question.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

// Maximum response word limit
const MAX_RESPONSE_WORDS = 15;

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * Helper function to truncate response to max words
 */
function truncateToMaxWords(text, maxWords) {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) {
        return text;
    }
    return words.slice(0, maxWords).join(' ') + '...';
}

/**
 * Chat endpoint - OpenAI API
 */
app.post('/api/chat', async (req, res) => {
    try {
        const { messages, system, model, maxTokens, temperature } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        // Prepare messages with system prompt for OpenAI format
        // Add word limit instruction to system prompt
        const openaiMessages = [];
        const wordLimitInstruction = `\n\nIMPORTANT: You MUST keep ALL responses to ${MAX_RESPONSE_WORDS} words or less. Be extremely concise and brief. No exceptions.`;
        
        if (system) {
            openaiMessages.push({ role: 'system', content: system + wordLimitInstruction });
        } else {
            openaiMessages.push({ role: 'system', content: `You are a helpful assistant.${wordLimitInstruction}` });
        }
        openaiMessages.push(...messages);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: model || 'gpt-4o-mini',
                max_tokens: 50, // Limit tokens to enforce short responses
                temperature: temperature || 0.8,
                messages: openaiMessages
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('OpenAI API Error:', error);
            return res.status(response.status).json({ error: error.error?.message || 'API error' });
        }

        const data = await response.json();
        let responseText = data.choices[0]?.message?.content || 'No response generated.';
        
        // Enforce word limit on response (backup truncation)
        responseText = truncateToMaxWords(responseText, MAX_RESPONSE_WORDS);

        res.json({
            response: responseText,
            usage: data.usage
        });

    } catch (error) {
        console.error('Chat endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * ElevenLabs TTS endpoint
 */
app.post('/api/tts/elevenlabs', async (req, res) => {
    try {
        const { text, voiceId, modelId, voiceSettings } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || process.env.ELEVENLABS_VOICE_ID || 'ErXwobaYiN019PkySvjV'}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': process.env.ELEVENLABS_API_KEY
                },
                body: JSON.stringify({
                    text: text,
                    model_id: modelId || 'eleven_monolingual_v1',
                    voice_settings: voiceSettings || {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('ElevenLabs API Error:', error);
            return res.status(response.status).json({ error: error.detail || 'TTS API error' });
        }

        // Stream the audio response
        res.set({
            'Content-Type': 'audio/mpeg',
            'Transfer-Encoding': 'chunked'
        });

        const reader = response.body.getReader();
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();

    } catch (error) {
        console.error('ElevenLabs endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * ElevenLabs TTS with timestamps for lip-sync
 * Returns audio + word timestamps for precise mouth animation
 */
app.post('/api/tts/elevenlabs-with-timestamps', async (req, res) => {
    try {
        const { text, voiceId, modelId } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Text is required' });
        }

        const response = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voiceId || process.env.ELEVENLABS_VOICE_ID || 'ErXwobaYiN019PkySvjV'}/with-timestamps`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'xi-api-key': process.env.ELEVENLABS_API_KEY
                },
                body: JSON.stringify({
                    text: text,
                    model_id: modelId || 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.75
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('ElevenLabs Timestamps API Error:', error);
            return res.status(response.status).json({ error: error.detail || 'TTS API error' });
        }

        const data = await response.json();

        res.json({
            audio_base64: data.audio_base64,
            alignment: data.alignment // Contains character timestamps for lip-sync
        });

    } catch (error) {
        console.error('ElevenLabs timestamps endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * HeyGen - Create Streaming Avatar Session
 * Configured to use ElevenLabs voice for perfect lip-sync
 */
app.post('/api/heygen/create-session', async (req, res) => {
    try {
        const { avatarId, quality } = req.body;

        const response = await fetch('https://api.heygen.com/v1/streaming.new', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': process.env.HEYGEN_API_KEY
            },
            body: JSON.stringify({
                avatar_id: avatarId || process.env.HEYGEN_AVATAR_ID,
                quality: quality || 'medium',
                voice: {
                    voice_id: process.env.ELEVENLABS_VOICE_ID,
                    provider: 'elevenlabs',
                    api_key: process.env.ELEVENLABS_API_KEY // Pass ElevenLabs key to HeyGen
                }
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('HeyGen Create Session Error:', error);
            return res.status(response.status).json({ error: error.message || 'HeyGen API error' });
        }

        const data = await response.json();

        res.json({
            session_id: data.data?.session_id,
            access_token: data.data?.access_token,
            url: data.data?.url
        });

    } catch (error) {
        console.error('HeyGen create session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * HeyGen - Send text to avatar for speaking
 */
app.post('/api/heygen/speak', async (req, res) => {
    try {
        const { sessionId, text, taskType } = req.body;

        if (!sessionId || !text) {
            return res.status(400).json({ error: 'Session ID and text are required' });
        }

        const response = await fetch('https://api.heygen.com/v1/streaming.task', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': process.env.HEYGEN_API_KEY
            },
            body: JSON.stringify({
                session_id: sessionId,
                text: text,
                task_type: taskType || 'talk'
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('HeyGen Speak Error:', error);
            return res.status(response.status).json({ error: error.message || 'HeyGen API error' });
        }

        const data = await response.json();

        res.json({
            task_id: data.data?.task_id
        });

    } catch (error) {
        console.error('HeyGen speak error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * HeyGen - Close streaming session
 */
app.post('/api/heygen/close-session', async (req, res) => {
    try {
        const { sessionId } = req.body;

        if (!sessionId) {
            return res.status(400).json({ error: 'Session ID is required' });
        }

        const response = await fetch('https://api.heygen.com/v1/streaming.stop', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': process.env.HEYGEN_API_KEY
            },
            body: JSON.stringify({
                session_id: sessionId
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('HeyGen Close Session Error:', error);
            return res.status(response.status).json({ error: error.message || 'HeyGen API error' });
        }

        res.json({ success: true });

    } catch (error) {
        console.error('HeyGen close session error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * HeyGen - Get available avatars
 */
app.get('/api/heygen/avatars', async (req, res) => {
    try {
        const response = await fetch('https://api.heygen.com/v1/streaming.list', {
            method: 'GET',
            headers: {
                'X-Api-Key': process.env.HEYGEN_API_KEY
            }
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('HeyGen Avatars Error:', error);
            return res.status(response.status).json({ error: error.message || 'HeyGen API error' });
        }

        const data = await response.json();

        res.json({
            avatars: data.data?.avatars || []
        });

    } catch (error) {
        console.error('HeyGen avatars error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * Combined endpoint: Chat + TTS + Avatar in one call
 * This is the main endpoint for the full conversation flow
 */
app.post('/api/conversation', async (req, res) => {
    try {
        const { messages, system, sessionId, useAvatar } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        // Prepare messages with system prompt for OpenAI format
        // Add word limit instruction to system prompt
        const wordLimitInstruction = `\n\nIMPORTANT: You MUST keep ALL responses to ${MAX_RESPONSE_WORDS} words or less. Be extremely concise and brief. No exceptions.`;
        
        const openaiMessages = [];
        if (system) {
            openaiMessages.push({ role: 'system', content: system + wordLimitInstruction });
        } else {
            openaiMessages.push({ role: 'system', content: `You are a helpful assistant.${wordLimitInstruction}` });
        }
        openaiMessages.push(...messages);

        // Step 1: Get AI response from OpenAI
        const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                max_tokens: 50, // Limit tokens to enforce short responses
                temperature: 0.8,
                messages: openaiMessages
            })
        });

        if (!chatResponse.ok) {
            const error = await chatResponse.json();
            console.error('OpenAI API Error:', error);
            return res.status(chatResponse.status).json({ error: error.error?.message || 'Chat API error' });
        }

        const chatData = await chatResponse.json();
        let responseText = chatData.choices[0]?.message?.content || 'No response generated.';
        
        // Enforce word limit on response (backup truncation)
        responseText = truncateToMaxWords(responseText, MAX_RESPONSE_WORDS);

        // Step 2: If using HeyGen avatar, send text to avatar
        if (useAvatar && sessionId) {
            try {
                const speakResponse = await fetch('https://api.heygen.com/v1/streaming.task', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Api-Key': process.env.HEYGEN_API_KEY
                    },
                    body: JSON.stringify({
                        session_id: sessionId,
                        text: responseText,
                        task_type: 'talk'
                    })
                });

                const speakData = await speakResponse.json();

                return res.json({
                    response: responseText,
                    taskId: speakData.data?.task_id,
                    useAvatar: true
                });
            } catch (avatarError) {
                console.error('Avatar speak error:', avatarError);
                // Continue without avatar
            }
        }

        // Return response (TTS will be handled client-side)
        res.json({
            response: responseText,
            useAvatar: false
        });

    } catch (error) {
        console.error('Conversation endpoint error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Something went wrong!' });
});

// Start server only in development (not on Vercel)
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`
🔍 ═══════════════════════════════════════════════ 🔍
   
   CLASSIFIED INVESTIGATION SERVER
   
   Server running on: http://localhost:${PORT}
   
   Endpoints:
   - POST /api/chat              - OpenAI conversation
   - POST /api/tts/elevenlabs    - ElevenLabs TTS
   - POST /api/tts/elevenlabs-with-timestamps - TTS with lip-sync data
   - POST /api/heygen/create-session - Create avatar session
   - POST /api/heygen/speak      - Make avatar speak
   - POST /api/heygen/close-session - Close avatar session
   - GET  /api/heygen/avatars    - List available avatars
   - POST /api/conversation      - Full conversation flow
   - GET  /api/health            - Health check
   
🔍 ═══════════════════════════════════════════════ 🔍
        `);
    });
}

// Export for Vercel serverless
module.exports = app;
