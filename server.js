require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "fonts.gstatic.com"],
      fontSrc: ["'self'", "fonts.googleapis.com", "fonts.gstatic.com"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : '*',
  methods: ['GET', 'POST'],
}));

app.use(express.json({ limit: '10kb' }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ── Serve static files ───────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Validation helpers ───────────────────────────────────────────────────────
const VALID_CHANNELS = ['twitter', 'instagram', 'linkedin', 'email', 'blog', 'ad'];
const VALID_TONES = ['warm & empowering', 'bold & direct', 'playful & witty', 'expert & authoritative', 'minimal & refined', 'conversational'];
const VALID_OBJECTIVES = ['Product launch', 'Brand awareness', 'Lead generation', 'Customer retention', 'Seasonal promotion', 'Educational / thought leadership'];

function validateRequest(body) {
  const { brand, channel } = body;
  if (!brand || !channel) return 'Missing brand or channel';
  if (!brand.name?.trim()) return 'Brand name is required';
  if (!VALID_CHANNELS.includes(channel)) return 'Invalid channel';
  if (brand.tone && !VALID_TONES.includes(brand.tone)) return 'Invalid tone';
  if (brand.objective && !VALID_OBJECTIVES.includes(brand.objective)) return 'Invalid objective';
  if (brand.name.length > 100) return 'Brand name too long';
  if (brand.brief?.length > 1000) return 'Brief too long';
  return null;
}

// ── Channel metadata ─────────────────────────────────────────────────────────
const channelMeta = {
  twitter:   { label: 'Twitter / X',      constraint: '280 characters max. Punchy hook + core message + 1-2 hashtags. Make it shareable and conversational.' },
  instagram: { label: 'Instagram',         constraint: 'Caption 150-300 chars. Emotional opener + story + 4-5 relevant hashtags. Use visual, sensory language.' },
  linkedin:  { label: 'LinkedIn',          constraint: 'Professional, 200-300 chars. Lead with insight, deliver value, end with a clear CTA. Build authority.' },
  email:     { label: 'Email campaign',    constraint: 'Format: Subject: [line]\nPreview: [text]\n\n[Body: intro + benefit + CTA ~120 words]. Warm, personal tone.' },
  blog:      { label: 'Blog post',         constraint: 'SEO-friendly intro paragraph (~100 words) + 3 H2 subheading suggestions. Hook readers in the first sentence.' },
  ad:        { label: 'Ad copy',           constraint: 'Provide 3 variants, each: Headline (≤6 words) | Subheadline (≤12 words) | CTA (≤4 words). Label each Variant 1/2/3.' },
};

// ── Build prompt ─────────────────────────────────────────────────────────────
function buildPrompt(brand, channel) {
  const meta = channelMeta[channel];
  return `You are an elite brand content strategist and copywriter.

BRAND PROFILE:
- Name: ${brand.name}
- Industry: ${brand.industry || 'Not specified'}
- Core values: ${brand.values || 'Not specified'}
- USP: ${brand.usp || 'Not specified'}

TARGET AUDIENCE:
- Who they are: ${brand.audience || 'Not specified'}
- Pain points: ${brand.painPoints || 'Not specified'}

CAMPAIGN:
- Objective: ${brand.objective || 'Brand awareness'}
- Brief: ${brand.brief || 'General brand content'}
- Tone of voice: ${brand.tone || 'warm & empowering'}

CHANNEL: ${meta.label}
REQUIREMENTS: ${meta.constraint}

Write ONLY the final content. No preamble, no explanations, no markdown code blocks. Make it feel genuinely crafted for this specific brand and platform. Every word must earn its place.`;
}

// ── Streaming generate endpoint ──────────────────────────────────────────────
app.post('/api/generate', async (req, res) => {
  const validationError = validateRequest(req.body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'API key not configured. Set ANTHROPIC_API_KEY in your .env file.' });
  }

  const { brand, channel } = req.body;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 700,
      messages: [{ role: 'user', content: buildPrompt(brand, channel) }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Anthropic error:', err.message);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    configured: !!process.env.ANTHROPIC_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// ── Catch-all → index.html ───────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✦ BrandForge AI running at http://localhost:${PORT}`);
  console.log(`  API key: ${process.env.ANTHROPIC_API_KEY ? '✓ configured' : '✗ missing — set ANTHROPIC_API_KEY in .env'}\n`);
});
