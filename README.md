# 🏝️ Talking Island Friend

An interactive talking character website with a tropical island theme! Features AI-powered conversations, text-to-speech, and fun character animations.

![Tropical Island Theme](https://img.shields.io/badge/Theme-Tropical%20Paradise-blue)
![AI Powered](https://img.shields.io/badge/AI-Claude%20Powered-purple)
![TTS](https://img.shields.io/badge/TTS-Multi--Provider-green)

## ✨ Features

- 🎭 **Animated Character** - Bouncy, lively character with mouth sync animations
- 🗣️ **Text-to-Speech** - Multiple TTS providers (ElevenLabs, OpenAI, Browser)
- 🤖 **AI Conversations** - Powered by Claude for intelligent, contextual responses
- 🎮 **Pre-set Quote Buttons** - Quick access to fun topics
- 🎤 **Voice Input** - Speak to your island friend
- 🌴 **Tropical Theme** - Sandy beige, ocean blue, and white color scheme
- 📱 **Responsive Design** - Works on all devices
- 💾 **Conversation History** - Saves your chat locally

## 🚀 Quick Start

### Option 1: Browser TTS (No API Keys Required)

1. Open `index.html` in a web browser
2. The site works immediately with browser's built-in TTS
3. Conversations will use fallback responses (no Claude API)

### Option 2: Full Setup (Recommended)

#### Prerequisites
- Node.js 18+ installed
- API keys (see below)

#### Step 1: Install Server Dependencies

```bash
cd server
npm install
```

#### Step 2: Configure Environment Variables

1. Copy `env.example.txt` to `.env` in the server folder
2. Add your API keys:

```env
ANTHROPIC_API_KEY=your_claude_api_key
ELEVENLABS_API_KEY=your_elevenlabs_key  # Optional
OPENAI_API_KEY=your_openai_key          # Optional
```

#### Step 3: Start the Server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

#### Step 4: Serve the Frontend

Use any static file server. Examples:

```bash
# Python
python -m http.server 8080

# Node.js (npx)
npx serve -p 8080

# VS Code Live Server extension
# Just right-click index.html and select "Open with Live Server"
```

#### Step 5: Open in Browser

Navigate to `http://localhost:8080`

## 🔑 API Keys & Costs

### Claude API (Required for AI Conversations)
- **Get it at:** https://console.anthropic.com/
- **Cost:** ~$0.003 per 1K input tokens, ~$0.015 per 1K output tokens
- **Estimated:** ~$0.01-0.05 per conversation

### ElevenLabs (Recommended TTS)
- **Get it at:** https://elevenlabs.io/
- **Free tier:** 10,000 characters/month
- **Paid:** Starting at $5/month for 30,000 characters
- **Quality:** Excellent, very natural sounding

### OpenAI TTS (Alternative)
- **Get it at:** https://platform.openai.com/
- **Cost:** $0.015 per 1K characters (tts-1), $0.030 (tts-1-hd)
- **Quality:** Good, slightly robotic

### Browser TTS (Free Fallback)
- Built into modern browsers
- Quality varies by browser/OS
- No cost, no setup required

## 🎨 Customization

### Change the Character

Replace the placeholder character in `index.html`:

```html
<div class="character-placeholder">
    <!-- Replace with your character image -->
    <img src="your-character.png" alt="Character" />
</div>
```

Update CSS in `styles.css` for custom character sizing.

### Change the Personality

Edit `js/config.js` to modify the character's personality:

```javascript
CLAUDE: {
    systemPrompt: `Your custom personality prompt here...`
}
```

### Change Colors

Edit CSS variables in `css/styles.css`:

```css
:root {
    --sand-light: #FDF6E3;
    --ocean-medium: #5BB5E0;
    /* ... more colors */
}
```

### Add Custom Quote Buttons

Edit `js/config.js`:

```javascript
QUOTES: [
    {
        id: 'custom',
        prompt: 'Your custom prompt',
        icon: '🎯',
        label: 'Button Label'
    },
    // ... more quotes
]
```

### Change TTS Voice

#### ElevenLabs Voices
Edit `js/config.js`:
```javascript
elevenlabs: {
    voiceId: 'your_voice_id_here',
    // Popular options:
    // 'pNInz6obpgDQGcFmaJgB' - Adam (deep, warm)
    // 'EXAVITQu4vr4xnSDxMaL' - Bella (soft, gentle)
    // 'ErXwobaYiN019PkySvjV' - Antoni (well-rounded)
}
```

#### OpenAI Voices
Options: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer`

## 📁 Project Structure

```
Talking Epstein/
├── index.html          # Main HTML file
├── css/
│   └── styles.css      # All styles and animations
├── js/
│   ├── config.js       # Configuration and settings
│   ├── character.js    # Character animation controller
│   ├── tts.js          # Text-to-speech controller
│   ├── conversation.js # Claude API and chat history
│   └── app.js          # Main application logic
├── server/
│   ├── server.js       # Express backend server
│   ├── package.json    # Node dependencies
│   └── env.example.txt # Environment variables template
└── README.md           # This file
```

## 🔧 Technical Details

### Frontend
- Pure HTML/CSS/JavaScript (no framework dependencies)
- CSS animations for character movements
- Web Speech API for browser TTS and voice input
- LocalStorage for conversation persistence

### Backend
- Express.js server
- Rate limiting (30 requests/minute)
- CORS protection
- Helmet security headers
- Proxy for secure API calls

### APIs Used
- **Anthropic Claude** - Conversational AI
- **ElevenLabs** - High-quality TTS
- **OpenAI** - Alternative TTS
- **Web Speech API** - Browser fallback TTS

## 🚢 Deployment

### Frontend Only (Static Hosting)
Deploy to any static host:
- GitHub Pages
- Netlify
- Vercel
- Cloudflare Pages

Note: Without the backend, only browser TTS will work.

### Full Stack
Deploy backend to:
- Railway
- Render
- Heroku
- DigitalOcean App Platform
- AWS/GCP/Azure

Example Render deployment:
1. Push server folder to GitHub
2. Create new Web Service on Render
3. Connect repository
4. Add environment variables
5. Deploy!

## 🐛 Troubleshooting

### "API error" messages
- Check your API keys in `.env`
- Ensure the backend server is running
- Check browser console for detailed errors

### No sound playing
- Check browser permissions for audio
- Try clicking somewhere on the page first (browser autoplay policies)
- Check if TTS provider is configured correctly

### Character not animating
- Ensure JavaScript is enabled
- Check browser console for errors
- Try refreshing the page

### Voice input not working
- Allow microphone permissions when prompted
- Use HTTPS or localhost (required for microphone access)
- Check if browser supports Web Speech API

## 📝 License

MIT License - feel free to use and modify!

## 🤝 Contributing

Contributions welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests

---

Made with 🌴 and ☀️ for tropical vibes!
