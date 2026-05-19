# FinBot — Project Context for Claude

## What Is This

Complete solution to the 8 challenges of the RIWI AI Automation Practical Exam (2026).
A bilingual (ES/EN) conversational agent for a fintech called FinBot.
Private GitHub repo: `WhiteRabbitCoder/finbot-simulacro`, branch `simulacro`.

## Stack

- **Backend:** Python 3.12 + FastAPI + OpenAI SDK
- **Frontend:** Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4
- **Vector search (RAG):** PostgreSQL + pgvector (HNSW index, cosine similarity)
- **Semantic cache:** Redis Stack + RediSearch (FLAT vector index) — falls back to in-memory if `REDIS_URL` unset
- **Auth:** JWT HS256 + bcrypt (passlib + bcrypt==4.0.1 pinned — incompatible with bcrypt ≥ 4.1)
- **Database:** PostgreSQL (NeonDB in prod) — required; no SQLite fallback anywhere

## File Structure

```
backend/
├── main.py         # FastAPI: lifespan, all endpoints (auth, chat, admin, health)
├── agent.py        # FinBot agent: system prompt (editable via admin), 7-turn memory, tool enable/disable, vision
├── tools.py        # 4 tools: calculate_interest, get_usd_rate, get_crypto_price, web_search
├── rag.py          # RAG: scraping + chunking + pgvector (HNSW, cosine)
├── cache.py        # Semantic cache: Redis Stack (RediSearch) with in-memory fallback
├── auth.py         # JWT auth, bcrypt, user management, admin seeding
├── analytics.py    # Tool call counts, cache hit rate, query log, agent_config table (PostgreSQL)
├── config.py       # OpenAI clients per service + all env var constants
├── Dockerfile      # python:3.12-slim, uvicorn without --reload
└── requirements.txt

frontend/
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── admin-panel.tsx
│   ├── chat/chat-header.tsx, chat-input.tsx, chat-messages.tsx, status-panel.tsx
│   ├── faq-view.tsx
│   ├── login-screen.tsx
│   ├── onboarding.tsx
│   ├── settings-drawer.tsx
│   └── theme-provider.tsx
├── lib/
│   ├── api.ts          # All backend API calls; reads NEXT_PUBLIC_API_URL
│   ├── translations.ts
│   └── types.ts
├── public/logo.png     # ConejoMillonario.png — white rabbit, transparent bg
├── Dockerfile          # node:20-alpine multi-stage, output: standalone
└── next.config.mjs     # output: 'standalone' for Docker multi-stage build

docker-compose.yml      # Starts: postgres (pgvector), redis-stack, backend, frontend
```

## Key Design Decisions

### OpenAI Clients per Service (`config.py`)
Each service has its own client with independent `base_url` and `api_key`.
If `*_BASE_URL` / `*_API_KEY` are not set, they fall back to `BASE_URL` / `API_KEY` global.
Allows mixing providers (NVIDIA NIM, Groq, Ollama, etc.) without code changes.

```python
llm_client        = _client("LLM_BASE_URL",        "LLM_API_KEY")
vision_client     = _client("VISION_BASE_URL",      "VISION_API_KEY")
embeddings_client = _client("EMBEDDINGS_BASE_URL",  "EMBEDDINGS_API_KEY")
stt_client        = _client("STT_BASE_URL",         "STT_API_KEY")
tts_client        = _client("TTS_BASE_URL",         "TTS_API_KEY")
```

### Semantic Cache (`cache.py`)
`REDIS_URL` defined → Redis Stack with RediSearch vector index (FLAT, COSINE, DIM=1536).
`REDIS_URL` absent → `_fallback: list[dict]` in RAM (cosine sim via numpy).
RediSearch COSINE returns distance in [0, 2] where 0 = identical. Similarity = `1 - distance`.
Redis module import path: `redis.commands.search.index_definition` (snake_case, redis-py 7.x).

### RAG (`rag.py`)
pgvector replaced FAISS. Tables: `rag_chunks` (vector(1536)) and `rag_sources` (tracked URLs).
HNSW index with `vector_cosine_ops` for fast approximate nearest-neighbor search.
`CREATE EXTENSION IF NOT EXISTS vector` is wrapped in try/except + rollback because NeonDB
raises UniqueViolation even with IF NOT EXISTS (Docker local PostgreSQL does not have this issue).
Module-level `init_tables()` called in lifespan; `ingest()` only runs if `rag.is_ready()` is False.

### Agent — System Prompt + Tool Control (`agent.py`)
Module-level `SYSTEM_PROMPT` string — editable at runtime via `set_system_prompt()`.
Persisted to PostgreSQL table `agent_config (key, value)` on each admin save; loaded on startup.
Fallback: if `agent_config` has no `"system_prompt"` row, the hardcoded default in `agent.py` is used.

Module-level `_disabled_tools: set[str]` — tools in this set are filtered out of `TOOLS_SCHEMA` before each LLM call.
`set_tool_enabled(tool_id, enabled)` adds/removes from the set. Changes are in-memory only (reset on restart).

Module-level `_messages` list (single-session per process).
Trimmed to last 14 messages (7 turns) after adding the response.
Vision: uses `vision_client` if `image_b64` present, else `llm_client`.

### Auth (`auth.py`)
`DATABASE_URL` is required — raises `RuntimeError` at import if missing.
JWT tokens signed with `JWT_SECRET` (auto-generated per-process if not set; set explicitly in production).
Admin user seeded from `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars on first run (only if users table is empty).
bcrypt pinned to `==4.0.1` — passlib 1.7.4 is incompatible with bcrypt ≥ 4.1.

### Frontend API URL (`NEXT_PUBLIC_API_URL`)
`frontend/lib/api.ts` line 1: `const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8085'`
This var is baked into the JS bundle at build time. Passed as build `ARG` in `frontend/Dockerfile`.
For Docker Compose: browser calls `http://localhost:8085` (host-exposed port, not internal Docker network).
For production: set `NEXT_PUBLIC_API_URL` in Vercel dashboard or via `vercel env add`.

### Docker Setup
- Backend CMD: `uvicorn main:app --host 0.0.0.0 --port 8085` (no `--reload`)
- Frontend: multi-stage build requires `output: 'standalone'` in `next.config.mjs`
- `docker-compose.yml` uses `env_file: ./backend/.env` for API keys, overrides connection strings
- Postgres image: `pgvector/pgvector:pg17` — pgvector pre-installed
- Redis image: `redis/redis-stack-server:latest` — RediSearch pre-installed, no auth/TLS needed locally

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BASE_URL` | Global LLM endpoint (fallback) | `https://api.openai.com/v1` |
| `API_KEY` | Global API key (fallback) | — |
| `LLM_BASE_URL` / `LLM_API_KEY` | Override for chat/completions | uses global |
| `VISION_BASE_URL` / `VISION_API_KEY` | Override for multimodal vision | uses global |
| `EMBEDDINGS_BASE_URL` / `EMBEDDINGS_API_KEY` | Override for embeddings | uses global |
| `STT_BASE_URL` / `STT_API_KEY` | Override for Whisper STT | uses global |
| `TTS_BASE_URL` / `TTS_API_KEY` | Override for TTS | uses global |
| `DATABASE_URL` | PostgreSQL connection string | — (**required**) |
| `REDIS_URL` | Redis Stack URL | in-memory fallback if absent |
| `EMBEDDING_DIM` | Vector dimension | `1536` |
| `SIMILARITY_THRESHOLD` | Cosine threshold for cache hits | `0.90` |
| `RAG_URL` | URL to scrape and index | Nequi FAQ |
| `RAG_CHUNK_SIZE` | Characters per chunk | `500` |
| `RAG_CHUNK_OVERLAP` | Overlap between chunks | `80` |
| `PORT` | Backend server port | `8000` |
| `JWT_SECRET` | JWT signing secret | auto-generated |
| `ADMIN_EMAIL` | Admin account email | `admin@finbot.co` |
| `ADMIN_PASSWORD` | Admin account password | `admin1234` |

## Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | public | Create user account |
| POST | `/auth/login` | public | Get JWT token |
| GET | `/auth/me` | user | Current user profile |
| POST | `/chat` | user | Main chat (text + optional image) |
| POST | `/transcribe` | user | Audio → text (Whisper) |
| POST | `/speak` | user | Text → audio stream (TTS) |
| POST | `/reset` | user | Clear session memory |
| GET | `/health` | public | Server status, RAG chunks, cache entries |
| GET | `/admin/analytics` | admin | Tool counts, cache hit rate, top queries |
| POST | `/admin/config` | admin | Update env vars live |
| GET | `/admin/prompt` | admin | Get current system prompt |
| POST | `/admin/prompt` | admin | Update system prompt (memory + DB) |
| GET | `/admin/tools` | admin | List tools with enabled/disabled status |
| POST | `/admin/tools/{tool_id}` | admin | Enable or disable a tool |
| POST | `/admin/rag/add` | admin | Index new URL |
| POST | `/admin/rag/reindex` | admin | Re-scrape URL(s) |
| DELETE | `/admin/rag` | admin | Remove URL from index |
| DELETE | `/admin/cache` | admin | Clear semantic cache |

## How to Run

### With Docker (everything local)
```bash
cp backend/.env.example backend/.env  # fill in API_KEY
docker compose up --build
# Frontend: http://localhost:3000
# Backend:  http://localhost:8085
```

### Manual
```bash
# Backend
cd backend
source .venv/bin/activate
pip install -r requirements.txt
python3 main.py

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Conventions

- **Commits:** no Claude co-authorship (explicit business restriction from user).
- **Active branch:** `simulacro` (not `main`).
- **`.env` files:** `backend/.env` only — never at repo root.
- **No `@app.on_event`** — already migrated to `lifespan` with `asynccontextmanager`.
- **bcrypt must stay at `==4.0.1`** — passlib 1.7.4 incompatible with bcrypt ≥ 4.1.
- **Redis module path:** `redis.commands.search.index_definition` (snake_case, redis-py 7.x).
