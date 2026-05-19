# FinBot — Bilingual Financial AI Assistant

FinBot is a bilingual (ES/EN) conversational agent for a fintech company. It features JWT authentication, semantic caching, vector RAG, multimodal vision, voice I/O, web search, and an admin panel — all runnable with a single `docker compose up`.

---

## Features

### Core Agent
- **Bilingual**: detects and responds in Spanish or English automatically
- **Contextual memory**: retains the last 7 conversation turns per session
- **4 autonomous tools** invoked when the agent needs real-time data:
  - `calculate_interest` — compound interest projections
  - `get_usd_rate` — live USD/COP exchange rate (no API key)
  - `get_crypto_price` — live crypto prices via CoinGecko (no API key)
  - `web_search` — DuckDuckGo web search (no API key)

### Data & Intelligence
- **Semantic cache** (Redis Stack + RediSearch): near-duplicate queries return instantly without calling the LLM; cosine similarity threshold configurable (default 0.90)
- **RAG** (PostgreSQL + pgvector): scrapes and indexes a web URL on startup, retrieves relevant chunks for grounded answers
- **Multimodal vision**: attach an image (expense statement, receipt, chart) for visual analysis

### Voice Pipeline
- **STT**: browser records audio → Whisper transcribes to text
- **TTS**: agent replies streamed back as `audio/mpeg`

### Auth & Admin
- **JWT authentication** (HS256): all chat endpoints require a Bearer token
- **Role-based access**: `user` (chat only) vs `admin` (full admin panel)
- **Admin panel**:
  - Live analytics: tool call counts, cache hit rate, top queries
  - RAG management: add URL, reindex, delete
  - Cache management: clear all entries
  - Config editor: update env vars at runtime (`SIMILARITY_THRESHOLD` applies immediately)

### Frontend (Next.js 16)
- Login + registration screen with JWT flow
- 3-step onboarding: name + theme selection
- Chat with badges: tool used, cache hit, image attached
- Voice notes: record, play, show/hide transcript
- Settings drawer: theme, language (ES/EN), timestamps, TTS toggle
- Mobile status panel: backend health, RAG chunks, cache entries
- FAQ viewer with pre-loaded fintech Q&A
- 4 themes: Warm, Midnight, Moss, Slate

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   docker compose up                      │
│                                                          │
│  ┌────────────┐    ┌────────────┐    ┌───────────────┐  │
│  │  frontend   │    │  backend   │    │  PostgreSQL   │  │
│  │  Next.js    │    │  FastAPI   │    │  + pgvector   │  │
│  │  :3000      │───▶│  :8085     │───▶│  :5432        │  │
│  └────────────┘    └─────┬──────┘    └───────────────┘  │
│                          │                               │
│                          │           ┌───────────────┐  │
│                          └──────────▶│  Redis Stack   │  │
│                                      │  + RediSearch  │  │
│                                      │  :6379         │  │
│                                      └───────────────┘  │
└─────────────────────────────────────────────────────────┘
  Browser ──▶ localhost:3000  (frontend)
  Browser ──▶ localhost:8085  (backend API, direct calls from browser)
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.12 + FastAPI + Uvicorn |
| Frontend | Next.js 16 + React 19 + TypeScript |
| UI components | Tailwind CSS v4 + shadcn/ui |
| LLM / Vision / STT / TTS | OpenAI-compatible SDK (configurable per service) |
| Vector search (RAG) | PostgreSQL 17 + pgvector (HNSW, cosine) |
| Semantic cache | Redis Stack + RediSearch (FLAT vector index, cosine) |
| Authentication | JWT HS256 + bcrypt (passlib) |
| Web scraping | BeautifulSoup4 + Requests |

---

## Quick Start with Docker

**Requirements:** Docker + Docker Compose v2 (included in Docker Desktop).

### 1. Configure

```bash
git clone https://github.com/WhiteRabbitCoder/finbot-simulacro.git
cd finbot-simulacro

cp backend/.env.example backend/.env
# Open backend/.env and set at minimum:
#   API_KEY=sk-...   (your OpenAI-compatible API key)
```

### 2. Start

```bash
docker compose up --build
```

First run takes a few minutes to build images and index RAG content. Subsequent starts are fast. Four services start in dependency order:

1. **postgres** — PostgreSQL 17 with pgvector, creates all tables automatically
2. **redis** — Redis Stack with RediSearch, creates vector index automatically
3. **backend** — FastAPI on port 8085, waits for healthy DB + Redis
4. **frontend** — Next.js on port 3000, waits for backend

### 3. Open

```
http://localhost:3000
```

Default admin credentials (change in `.env` before production):
- Email: `admin@finbot.co`
- Password: `admin1234`

### 4. Stop

```bash
docker compose down        # stop containers, keep database volumes
docker compose down -v     # stop containers and wipe all data (full reset)
```

---

## Manual Setup (Without Docker)

Use this to run backend and frontend separately, or to connect to external cloud services.

**Prerequisites:** Python 3.12+, Node.js 20+, PostgreSQL with pgvector, Redis Stack.

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env             # fill in API_KEY, DATABASE_URL, REDIS_URL
python3 main.py
```

Server starts at `http://localhost:8085` (configurable via `PORT` in `.env`).

### Frontend

```bash
cd frontend
npm install
# Optional: if backend is not at localhost:8085
# echo "NEXT_PUBLIC_API_URL=http://your-backend" > .env.local
npm run dev
```

Frontend at `http://localhost:3000`.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in the required fields.

### Required

| Variable | Description |
|----------|-------------|
| `API_KEY` | API key for all LLM services (global fallback) |
| `DATABASE_URL` | PostgreSQL connection string (required — no SQLite fallback) |

### LLM Services

No vendor lock-in. Each service can use a different provider. Unset `*_BASE_URL`/`*_API_KEY` fall back to `BASE_URL`/`API_KEY`.

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | Global LLM endpoint | `https://api.openai.com/v1` |
| `LLM_BASE_URL` / `LLM_API_KEY` | Chat completions | uses global |
| `VISION_BASE_URL` / `VISION_API_KEY` | Multimodal vision | uses global |
| `EMBEDDINGS_BASE_URL` / `EMBEDDINGS_API_KEY` | Embeddings | uses global |
| `STT_BASE_URL` / `STT_API_KEY` | Whisper STT | uses global |
| `TTS_BASE_URL` / `TTS_API_KEY` | Text-to-speech | uses global |

**Provider examples:**

```env
# All on OpenAI
API_KEY=sk-proj-...

# LLM on Groq (faster), vision + embeddings on OpenAI
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_API_KEY=gsk_...
VISION_BASE_URL=https://api.openai.com/v1
EMBEDDINGS_BASE_URL=https://api.openai.com/v1

# STT via local Ollama
STT_BASE_URL=http://localhost:11434/v1
STT_API_KEY=ollama
```

### Models

| Variable | Default |
|----------|---------|
| `MODEL_NAME` | `gpt-4o-mini` |
| `VISION_MODEL` | `gpt-4o` |
| `EMBEDDINGS_MODEL` | `text-embedding-3-small` |
| `STT_MODEL` | `whisper-1` |
| `TTS_MODEL` | `tts-1` |
| `TTS_VOICE` | `nova` |

### Database & Cache

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — (required) |
| `REDIS_URL` | Redis Stack URL | in-memory fallback if unset |
| `EMBEDDING_DIM` | Vector dimension | `1536` |
| `SIMILARITY_THRESHOLD` | Cosine similarity cutoff for cache | `0.90` |

### RAG

| Variable | Description | Default |
|----------|-------------|---------|
| `RAG_URL` | URL to scrape and index on startup | Nequi FAQ |
| `RAG_CHUNK_SIZE` | Characters per chunk | `500` |
| `RAG_CHUNK_OVERLAP` | Overlap between chunks | `80` |

### Server & Auth

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `8000` |
| `JWT_SECRET` | JWT signing secret | auto-generated |
| `ADMIN_EMAIL` | Admin account email | `admin@finbot.co` |
| `ADMIN_PASSWORD` | Admin account password | `admin1234` |

---

## API Endpoints

All endpoints except `/health`, `/auth/register`, and `/auth/login` require:
```
Authorization: Bearer <token>
```

### Auth

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/auth/register` | `{email, password}` | `{access_token, role}` |
| POST | `/auth/login` | `{email, password}` | `{access_token, role}` |
| GET | `/auth/me` | — | `{email, role}` |

### Chat

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/chat` | `{message, image_b64?}` | `{reply, tool_used, from_cache}` |
| POST | `/transcribe` | `multipart/form-data audio` | `{text}` |
| POST | `/speak` | `{text}` | `audio/mpeg` stream |
| POST | `/reset` | — | `{status}` |

### Admin (role: admin only)

| Method | Path | Body | Response |
|--------|------|------|----------|
| GET | `/admin/analytics` | — | `{tool_counts, cache_hit_rate, top_queries}` |
| POST | `/admin/config` | `{env: {KEY: VALUE}}` | `{ok, restart_required}` |
| GET | `/admin/prompt` | — | `{prompt}` |
| POST | `/admin/prompt` | `{prompt}` | `{ok}` |
| GET | `/admin/tools` | — | `{tools: [{id, name, description, enabled}]}` |
| POST | `/admin/tools/{tool_id}` | `{enabled}` | `{ok}` |
| POST | `/admin/rag/add` | `{url}` | `{ok, chunks}` |
| POST | `/admin/rag/reindex` | `{url?}` | `{ok}` |
| DELETE | `/admin/rag` | `{url}` | `{ok}` |
| DELETE | `/admin/cache` | — | `{ok}` |

### System

| Method | Path | Response |
|--------|------|----------|
| GET | `/health` | `{status, rag_chunks, cache_entries}` |

### Chat response format

```json
{
  "reply": "Bitcoin is currently at $67,450 USD.",
  "tool_used": "get_crypto_price",
  "from_cache": false
}
```

- `tool_used` — name of the tool invoked, or `null`
- `from_cache` — `true` if answered from semantic cache (LLM not called)

---

## Deployment Guide

### Option A: Docker Compose on a VPS

The included `docker-compose.yml` runs all four services on a single machine. Suitable for demos, staging, or small production loads.

**Requirements:** any Linux server with Docker installed (DigitalOcean Droplet, AWS EC2, Hetzner VPS, etc.).

```bash
# On the server
git clone https://github.com/WhiteRabbitCoder/finbot-simulacro.git
cd finbot-simulacro

cp backend/.env.example backend/.env
nano backend/.env        # set API_KEY, change ADMIN_PASSWORD, set JWT_SECRET

docker compose up -d --build   # start in background
docker compose logs -f         # follow logs
```

**Production hardening checklist:**
- [ ] Set a strong `JWT_SECRET` (e.g., `openssl rand -hex 32`)
- [ ] Change `ADMIN_PASSWORD` from `admin1234`
- [ ] Restrict CORS origins in `backend/main.py` (currently `"*"`)
- [ ] Put Nginx in front for TLS termination:
  ```nginx
  server {
      listen 443 ssl;
      server_name your-domain.com;

      location / { proxy_pass http://localhost:3000; }
      location /api/ {
          rewrite ^/api/(.*)$ /$1 break;
          proxy_pass http://localhost:8085;
      }
  }
  ```
- [ ] Enable Docker's log rotation to avoid disk fill

**Rebuilding after code changes:**
```bash
docker compose up -d --build backend    # rebuild only backend
docker compose up -d --build frontend   # rebuild only frontend
```

---

### Option B: Separate Cloud Services

Deploy each piece to a managed platform and use cloud-hosted databases. Best for teams or when you need independent scaling.

#### Databases

**PostgreSQL + pgvector:** [NeonDB](https://neon.tech) (free tier, pgvector pre-installed)
1. Create a project → copy the connection string
2. Add to `backend/.env`: `DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require`

**Redis Stack + RediSearch:** [Redis Cloud](https://redis.io/try-free) (free tier)
1. Create a database — select **Redis Stack** (includes RediSearch module)
2. Add to `backend/.env`: `REDIS_URL=rediss://default:pass@redis-xxxxx.ec2.redns.redis-cloud.com:PORT`

> **Important:** Render's native Key-Value store does **not** include RediSearch. Use Redis Cloud or a self-hosted Redis Stack container.

#### Backend — Render / Railway / Fly.io

**Render (Web Service):**
- Runtime: Python 3
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- Root directory: `backend`
- Add all env vars from `.env.example` in the Render dashboard

**Fly.io:**
```bash
cd backend
fly launch --name finbot-backend
fly secrets set API_KEY=sk-... DATABASE_URL=postgresql://...
fly deploy
```

#### Frontend — Vercel (recommended for Next.js)

```bash
cd frontend
# Install Vercel CLI
npm i -g vercel

# Set the backend URL before deploying
# In Vercel dashboard → Settings → Environment Variables:
# NEXT_PUBLIC_API_URL = https://your-backend-url.onrender.com

vercel --prod
```

> `NEXT_PUBLIC_API_URL` is baked into the JS bundle at build time. Set it in the Vercel dashboard before deploying, or pass it via `vercel env add NEXT_PUBLIC_API_URL`.

#### Local frontend pointing to cloud backend

```bash
echo "NEXT_PUBLIC_API_URL=https://your-backend.onrender.com" > frontend/.env.local
cd frontend && npm run dev
```

---

## End-to-End Test Sequence (Challenge 08)

1. `"Hola, soy Daniela, analista financiera"` → formal tone in ES, remembers name
2. `"What is the current USD to COP rate?"` → badge: `get_usd_rate`
3. `"¿Cuál es el horario de atención de FinBot?"` → badge: ⚡ Cache
4. Attach bank statement image + `"¿cuánto gasté en restaurantes?"` → visual analysis
5. Voice message → `"¿Cómo está el Bitcoin hoy?"` → STT + badge: `get_crypto_price`
6. `"Según la web de FinBot, ¿cuáles son los CDTs disponibles?"` → RAG-grounded answer
7. Enable TTS + `"Summarize what we discussed today"` → EN summary + audio playback
8. `"¿Recuerdas cómo me llamo?"` → "Daniela" (7-turn memory active)

---

## API Keys Required

| Service | Variable | Notes |
|---------|----------|-------|
| LLM / Vision / Embeddings / STT / TTS | `API_KEY` (+ per-service overrides) | Any OpenAI-compatible provider |
| CoinGecko | — | Free, no key required |
| ExchangeRate API | — | Free, no key required |
| DuckDuckGo Search | — | Free, no key required |
