# FinBot — Contexto del proyecto para Claude

## Qué es esto

Solución completa a los 8 retos del Simulacro de Práctica de RIWI (Automatización con IA, 2026).
Es un agente conversacional bilingüe (ES/EN) para una fintech llamada FinBot.
Repo privado en GitHub: `WhiteRabbitCoder/finbot-simulacro`, rama `simulacro`.

## Stack

- **Backend:** Python 3.12 + FastAPI + OpenAI SDK
- **Frontend:** React 18 + Tailwind CSS v3 + Vite
- **Vector store:** FAISS en disco (`faiss-cpu`)
- **Base de datos:** NeonDB/PostgreSQL con fallback automático a SQLite

## Estructura de archivos

```
backend/
├── main.py         # FastAPI: lifespan, endpoints /chat /transcribe /speak /reset /health
├── agent.py        # Agente FinBot: system prompt, memoria 7 turnos, tool calling loop, visión
├── tools.py        # 3 tools: calculate_interest, get_usd_rate, get_crypto_price (CoinGecko)
├── rag.py          # RAG: scraping + chunking + FAISS en disco (IndexFlatIP + normalización L2)
├── cache.py        # Caché semántico: NeonDB o SQLite, similitud coseno con numpy
├── config.py       # Clientes OpenAI por servicio + constantes de env vars
└── requirements.txt

frontend/src/
├── App.jsx                     # Chat principal, toggles de modo entrada/salida
└── components/
    ├── ChatMessage.jsx          # Burbujas usuario/agente con badges
    ├── Badge.jsx                # Pill naranja (tool) y verde (caché)
    └── VoiceRecorder.jsx        # MediaRecorder → /transcribe
```

## Decisiones de diseño clave

### Clientes OpenAI por servicio (`config.py`)
Cada servicio tiene su propio cliente con `base_url` y `api_key` independientes.
Si `*_BASE_URL` / `*_API_KEY` no están definidos, caen al `BASE_URL` / `API_KEY` global.
Esto permite mezclar proveedores (NVIDIA NIM, Groq, Ollama, etc.) sin tocar código.

```python
llm_client        = _client("LLM_BASE_URL",       "LLM_API_KEY")
vision_client     = _client("VISION_BASE_URL",     "VISION_API_KEY")
embeddings_client = _client("EMBEDDINGS_BASE_URL", "EMBEDDINGS_API_KEY")
stt_client        = _client("STT_BASE_URL",        "STT_API_KEY")
tts_client        = _client("TTS_BASE_URL",        "TTS_API_KEY")
```

### Base de datos del caché (`cache.py`)
`DATABASE_URL` definida → psycopg2 (NeonDB/PostgreSQL).
`DATABASE_URL` ausente → sqlite3 stdlib (fallback automático, cero configuración).
`_PH` es el placeholder SQL (`%s` vs `?`) que cambia según el driver activo.
`_cache: list[dict]` en RAM es la capa de rendimiento; la DB es la fuente de verdad.

### Índice FAISS (`rag.py`)
`IndexFlatIP` con vectores normalizados con `faiss.normalize_L2` = similitud coseno real.
Se guarda en `faiss.index` + `faiss_chunks.json` tras cada ingest.
Al importar el módulo intenta `_load_from_disk()` — si existe, no re-indexa.
El lifespan en `main.py` solo llama a `ingest()` si `rag._index is None`.

### Memoria del agente (`agent.py`)
Lista `_messages` a nivel de módulo (single-session por proceso).
Se recorta a los últimos 14 mensajes (7 turnos) DESPUÉS de agregar la respuesta.
El system prompt está en inglés para no contaminar la detección de idioma.
Visión: usa `vision_client` si hay `image_b64`, `llm_client` si es solo texto.

### PORT configurable
`main.py` tiene bloque `if __name__ == "__main__"` que lee `PORT` del `.env`.
Correr con: `python3 main.py` (no `uvicorn main:app --reload`).

## Variables de entorno importantes

| Variable | Descripción | Default |
|----------|-------------|---------|
| `BASE_URL` | Endpoint LLM global (fallback) | `https://api.openai.com/v1` |
| `API_KEY` | API key global (fallback) | — |
| `LLM_BASE_URL` / `LLM_API_KEY` | Override para chat/completions | usa global |
| `VISION_BASE_URL` / `VISION_API_KEY` | Override para visión multimodal | usa global |
| `EMBEDDINGS_BASE_URL` / `EMBEDDINGS_API_KEY` | Override para embeddings | usa global |
| `STT_BASE_URL` / `STT_API_KEY` | Override para Whisper STT | usa global |
| `TTS_BASE_URL` / `TTS_API_KEY` | Override para TTS | usa global |
| `DATABASE_URL` | Connection string PostgreSQL/NeonDB | SQLite si ausente |
| `CACHE_DB_PATH` | Ruta del archivo SQLite | `cache.db` |
| `FAISS_INDEX_PATH` | Ruta del índice FAISS | `faiss.index` |
| `FAISS_CHUNKS_PATH` | Ruta del JSON de chunks | `faiss_chunks.json` |
| `PORT` | Puerto del servidor | `8000` |
| `SIMILARITY_THRESHOLD` | Umbral coseno para caché | `0.90` |
| `RAG_URL` | URL a indexar para RAG | FAQ de Nequi |

## Endpoints

| Método | Ruta | Body | Respuesta |
|--------|------|------|-----------|
| POST | `/chat` | `{message, image_b64?}` | `{reply, tool_used, from_cache}` |
| POST | `/transcribe` | `multipart/form-data` audio | `{text}` |
| POST | `/speak` | `{text}` | `audio/mpeg` stream |
| POST | `/reset` | — | `{status}` |
| GET | `/health` | — | `{status, rag_chunks, cache_entries}` |

## Convenciones de este proyecto

- **Commits:** sin co-autoría de Claude (restricción de negocio explícita del usuario).
- **Rama activa:** `simulacro` (no `main`).
- **`.env` files:** cada uno en su carpeta (`backend/.env`, `frontend/.env`), nunca en raíz.
- **Archivos de runtime** (`cache.db`, `faiss.index`, `faiss_chunks.json`) están en `.gitignore`.
- **No usar** `@app.on_event` — ya migrado a `lifespan` con `asynccontextmanager`.

## Cómo correr

```bash
# Backend
cd backend
source .venv/bin/activate   # o python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 main.py

# Frontend (otra terminal)
cd frontend
npm install
npm run dev
```
