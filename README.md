# ✦ BrandForge AI — Content Studio

AI-powered brand content generation across every marketing channel. Built with Node.js + Express backend and a streaming SSE frontend.

---

## ✨ Features

- **6 channels** — Twitter/X, Instagram, LinkedIn, Email, Blog, Ad copy
- **Real-time streaming** — content appears word-by-word as it's generated
- **Parallel generation** — all channels generate simultaneously
- **Per-card regeneration** — re-run any single channel without losing others
- **Export** — download all content as a `.txt` file
- **Copy all** — one click to copy every channel's content
- **Live stats** — word count, char count, generation time
- **Rate limiting** — 30 requests per 15 min (configurable)
- **API health check** — sidebar shows API connection status
- **Security** — Helmet.js headers, input validation, key server-side

---

## 🚀 Quick Start (Local)

### 1. Clone / download this folder

```bash
cd brandforge
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up your API key

```bash
cp .env.example .env
```

Open `.env` and add your Anthropic API key:
```
ANTHROPIC_API_KEY=sk-ant-...
```

Get your key at: https://console.anthropic.com

### 4. Start the server

```bash
npm start
```

Visit: **http://localhost:3000**

---

## 🌐 Deploy to Vercel (Recommended — Free)

### Option A: Vercel CLI

```bash
npm install -g vercel
vercel
```

When prompted:
- Set `ANTHROPIC_API_KEY` as an environment variable in the Vercel dashboard
- Framework: Other
- Build command: (leave blank)
- Output directory: public

Add `vercel.json` in root:

```json
{
  "version": 2,
  "builds": [{ "src": "server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "/server.js" }]
}
```

### Option B: Vercel Dashboard

1. Push this folder to a GitHub repo
2. Go to vercel.com → Import project
3. Add `ANTHROPIC_API_KEY` in Environment Variables
4. Deploy ✓

---

## 🚂 Deploy to Railway (Easiest)

1. Go to railway.app → New Project → Deploy from GitHub
2. Add environment variable: `ANTHROPIC_API_KEY=your_key`
3. Railway auto-detects Node.js and runs `npm start`
4. Done — you get a public URL instantly

---

## 🐳 Deploy with Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
docker build -t brandforge .
docker run -p 3000:3000 -e ANTHROPIC_API_KEY=your_key brandforge
```

---

## ⚙️ Configuration

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | required | Your Anthropic API key |
| `PORT` | 3000 | Server port |
| `NODE_ENV` | development | Set to `production` for CORS lockdown |

---

## 📁 Project Structure

```
brandforge/
├── server.js          ← Express backend (API proxy, security, rate limiting)
├── public/
│   └── index.html     ← Full frontend (HTML + CSS + JS, single file)
├── package.json
├── .env.example
└── README.md
```

---

## 🔒 Security Notes

- API key is **server-side only** — never exposed to the browser
- Input validation on all fields (length limits, allowlists)
- Rate limiting: 30 requests / 15 min per IP
- Helmet.js security headers
- CORS locked to same-origin in production

---

## 🛠 Development

```bash
npm run dev    # nodemon auto-restart on file changes
```

---

## 📝 Customising Channels

Edit `channelMeta` in `server.js` to change channel prompts:

```js
const channelMeta = {
  twitter: {
    label: 'Twitter / X',
    constraint: 'Your custom prompt constraints here'
  },
  // ...
};
```

---

## 💡 Tips for the Hackathon Demo

1. Pre-fill the brand fields with a compelling fictional brand
2. Select all 6 channels for maximum impact
3. Hit Generate — watch all content stream in parallel
4. Show the Export button to demonstrate end-to-end utility
5. Regenerate a single card to show per-channel control

---

Made with ✦ for hackathons
