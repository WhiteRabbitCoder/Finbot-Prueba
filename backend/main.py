# =============================================================
# DECISIONES TÉCNICAS · SIMULACRO FINBOT
# =============================================================
# Stack elegido y por qué:
#   - Python + FastAPI: control total del flujo, tipos claros,
#     fácil de extender con nuevos endpoints.
#   - OpenAI SDK con base_url configurable: permite cambiar de
#     proveedor (NVIDIA NIM, Ollama, Groq, Together AI) con solo
#     cambiar BASE_URL en el .env — sin tocar una línea de código.
#   - FAISS local en lugar de Pinecone/Supabase: sin signup,
#     sin latencia de red, ideal para el simulacro.
#   - Caché semántico con numpy: implementa la lógica desde cero
#     para demostrar el concepto; GPTCache sería overkill aquí.
#
# Primer paso que falló y causa raíz:
#   TODO — documentar durante la ejecución
#
# Decisión que cambié a mitad de camino:
#   TODO — documentar durante la ejecución
#
# Componente más difícil de integrar:
#   TODO — documentar durante la ejecución
#
# Lo que dejaría diferente con más tiempo:
#   - Persistencia del caché en disco (JSON o SQLite)
#   - Autenticación en los endpoints
#   - Tests automatizados para cada reto
# =============================================================

import base64
import io
import tempfile
import os
import time

from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import stt_client, tts_client, STT_MODEL, TTS_MODEL, TTS_VOICE
import agent
import analytics
import auth
import cache
import rag
import sessions


# ── State ─────────────────────────────────────────────────────
NEWS_CACHE = {}

# ── Lifespan ──────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    auth.init_users_table()
    auth.seed_admin()
    analytics.init_analytics_tables()
    analytics.init_agent_config_table()
    sessions.init_sessions_tables()
    stored_prompt = analytics.load_config_value("system_prompt")
    if stored_prompt:
        agent.set_system_prompt(stored_prompt)
        print("[Agent] System prompt loaded from DB")
    cache.init()
    cache.prepopulate()
    rag.init_tables()
    if not rag.is_ready():
        try:
            n = rag.ingest()
            print(f"[RAG] Indexed {n} chunks")
        except Exception as e:
            print(f"[RAG] Ingest skipped: {e}")
    yield


app = FastAPI(title="FinBot API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Schemas ───────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str
    image_b64: str | None = None
    session_id: str | None = None


class SpeakRequest(BaseModel):
    text: str


class RegisterRequest(BaseModel):
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class AdminConfigRequest(BaseModel):
    env: dict[str, str]

class RagAddRequest(BaseModel):
    url: str

class RagReindexRequest(BaseModel):
    url: str | None = None

class RagDeleteRequest(BaseModel):
    url: str

class PromptRequest(BaseModel):
    prompt: str

class ToolToggleRequest(BaseModel):
    enabled: bool


# ── Endpoints ─────────────────────────────────────────────────

# ── Auth endpoints (public) ───────────────────────────────────

@app.post("/auth/register", tags=["auth"])
async def register(req: RegisterRequest):
    """Create a new user account (role: user). Admins are seeded from env vars."""
    user = auth.create_user(req.email, req.password)
    token = auth.create_access_token(user["email"], user["role"])
    return {"access_token": token, "token_type": "bearer", "role": user["role"]}


@app.post("/auth/login", tags=["auth"])
async def login(req: LoginRequest):
    """Authenticate with email and password. Returns a JWT bearer token."""
    user = auth.authenticate_user(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    token = auth.create_access_token(user["email"], user["role"])
    return {"access_token": token, "token_type": "bearer", "role": user["role"]}


@app.get("/auth/me", tags=["auth"])
async def me(current_user: dict = Depends(auth.get_current_user)):
    """Return the authenticated user's profile."""
    return {"email": current_user["email"], "role": current_user["role"]}


# ── Chat endpoints (require user or admin) ────────────────────

@app.post("/chat", tags=["chat"])
async def chat(req: ChatRequest, current_user: dict = Depends(auth.get_current_user)):
    """
    Main chat endpoint. Checks semantic cache first, then RAG context,
    then calls the LLM agent with tool calling support.
    Returns: {reply, tool_used, from_cache, session_id}
    """
    user_id: int = current_user["id"]

    # Resolve or create session
    is_new = req.session_id is None
    if req.session_id:
        sess = sessions.get_session(req.session_id, user_id)
        if not sess:
            raise HTTPException(status_code=404, detail="Sesión no encontrada")
        session_id = req.session_id
    else:
        session_id = sessions.create_session(user_id)

    # 1. Semantic cache check (skip for image queries — no cache for multimodal)
    if not req.image_b64:
        cached_reply, from_cache = cache.lookup(req.message)
        if from_cache:
            analytics.log_query(req.message, from_cache=True)
            if is_new:
                sessions.set_title(session_id, user_id, sessions.auto_title(req.message))
            sessions.append_message(session_id, "user", req.message)
            sessions.append_message(session_id, "assistant", cached_reply, from_cache=True)
            return {"reply": cached_reply, "tool_used": None, "from_cache": True, "session_id": session_id}

    # 2. Hydrate agent memory from DB if session not in memory (e.g. after restart)
    if session_id not in agent.get_loaded_sessions():
        db_msgs = sessions.get_messages(session_id, user_id)
        agent.load_memory(session_id, db_msgs[-14:] if db_msgs else [])

    # 3. RAG context injection (skip for image queries)
    user_msg = req.message
    if not req.image_b64:
        chunks = rag.retrieve(req.message)
        if chunks:
            context = "\n\n".join(chunks)
            user_msg = f"Contexto de la web de FinBot:\n{context}\n\nPregunta: {req.message}"

    # Persist user message and auto-title on first turn
    if is_new:
        sessions.set_title(session_id, user_id, sessions.auto_title(req.message))
    sessions.append_message(session_id, "user", req.message)

    # 4. LLM agent call (with optional image)
    reply, tool_used = agent.chat(session_id, user_msg, req.image_b64)

    # Persist assistant reply
    sessions.append_message(session_id, "assistant", reply, tool_used=tool_used)

    # 5. Store new answer in semantic cache if no tool was used and no image
    if not tool_used and not req.image_b64:
        cache.store(req.message, reply)

    analytics.log_query(req.message, from_cache=False)
    if tool_used:
        analytics.log_tool_call(tool_used)

    return {"reply": reply, "tool_used": tool_used, "from_cache": False, "session_id": session_id}


@app.post("/transcribe", tags=["chat"])
async def transcribe(
    audio: UploadFile = File(...),
    current_user: dict = Depends(auth.get_current_user),
):
    """Speech-to-Text via Whisper. Accepts .mp3, .wav, .ogg, .webm (up to 25 MB)."""
    audio_bytes = await audio.read()
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo de audio supera los 25 MB.")

    suffix = os.path.splitext(audio.filename or "audio.webm")[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        with open(tmp_path, "rb") as f:
            transcript = stt_client.audio.transcriptions.create(model=STT_MODEL, file=f)
        return {"text": transcript.text}
    finally:
        os.unlink(tmp_path)


@app.post("/speak", tags=["chat"])
async def speak(req: SpeakRequest, current_user: dict = Depends(auth.get_current_user)):
    """Text-to-Speech via OpenAI TTS. Returns audio/mpeg binary stream."""
    response = tts_client.audio.speech.create(
        model=TTS_MODEL,
        voice=TTS_VOICE,
        input=req.text,
    )
    audio_bytes = response.read()
    return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")


@app.post("/reset", tags=["chat"])
async def reset(session_id: str | None = None, current_user: dict = Depends(auth.get_current_user)):
    """Clear in-memory context for a session."""
    if session_id:
        agent.reset_memory(session_id)
    return {"status": "memory cleared"}


# ── Session endpoints ─────────────────────────────────────────

@app.get("/sessions", tags=["chat"])
async def list_sessions(current_user: dict = Depends(auth.get_current_user)):
    """List all chat sessions for the authenticated user."""
    return {"sessions": sessions.get_sessions(current_user["id"])}


@app.post("/sessions", tags=["chat"])
async def create_session_endpoint(current_user: dict = Depends(auth.get_current_user)):
    """Create a new empty chat session."""
    session_id = sessions.create_session(current_user["id"])
    return {"session_id": session_id}


@app.get("/sessions/{session_id}", tags=["chat"])
async def get_session_endpoint(session_id: str, current_user: dict = Depends(auth.get_current_user)):
    """Get a session and its full message history."""
    sess = sessions.get_session(session_id, current_user["id"])
    if not sess:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    msgs = sessions.get_messages(session_id, current_user["id"])
    return {"session": sess, "messages": msgs}


@app.delete("/sessions/{session_id}", tags=["chat"])
async def delete_session_endpoint(session_id: str, current_user: dict = Depends(auth.get_current_user)):
    """Delete a session and all its messages."""
    sess = sessions.get_session(session_id, current_user["id"])
    if not sess:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    sessions.delete_session(session_id, current_user["id"])
    agent.reset_memory(session_id)
    return {"ok": True}


# ── Public ────────────────────────────────────────────────────

@app.get("/health", tags=["system"])
async def health():
    from config import MODEL, VISION_MODEL, STT_MODEL, TTS_MODEL
    active_tools = [t for t in agent.get_tools_status() if t["enabled"]]
    return {
        "status": "ok",
        "rag_chunks": rag.chunk_count(),
        "cache_entries": cache.count(),
        "redis_connected": cache.is_redis_connected(),
        "models": {
            "llm": MODEL,
            "vision": VISION_MODEL,
            "stt": STT_MODEL,
            "tts": TTS_MODEL,
        },
        "tools_active": len(active_tools),
    }


@app.get("/news", tags=["system"])
async def get_news(lang: str = "es"):
    """Get live economic news, cached for 10 minutes per language."""
    now = time.time()
    if lang in NEWS_CACHE and (now - NEWS_CACHE[lang]["timestamp"] < 600):
        return {"news": NEWS_CACHE[lang]["news"], "cached": True}
        
    query = "economía colombia finanzas noticias" if lang == "es" else "US economy finance news colombia"
    try:
        from ddgs import DDGS
        with DDGS() as ddgs:
            results = list(ddgs.news(query, max_results=8))

        formatted_news = []
        for i, item in enumerate(results):
            formatted_news.append({
                "id": f"live-{time.time()}-{i}",
                "source": item.get("source", "Noticias"),
                "headline": item.get("title", ""),
                "snippet": item.get("body", ""),
                "timeAgo": item.get("date", "")[:16].replace("T", " "),
                "url": item.get("url", ""),
            })
            
        NEWS_CACHE[lang] = {"timestamp": now, "news": formatted_news}
        return {"news": formatted_news, "cached": False}
    except Exception as e:
        print(f"[News Error] {str(e)}")
        # Allow the UI to elegantly fail or show an empty state, not a crash
        return {"news": [], "cached": False, "error": str(e)}


ARTICLE_CACHE: dict[str, dict] = {}

@app.get("/fetch-article", tags=["system"])
async def fetch_article(url: str, current_user: dict = Depends(auth.get_current_user)):
    """Scrape and return clean article text from a URL. Cached per URL for 30 minutes."""
    import requests as _requests
    from bs4 import BeautifulSoup

    now = time.time()
    if url in ARTICLE_CACHE and (now - ARTICLE_CACHE[url]["timestamp"] < 1800):
        return {"text": ARTICLE_CACHE[url]["text"], "cached": True}

    try:
        r = _requests.get(url, timeout=8, headers={"User-Agent": "Mozilla/5.0"})
        r.raise_for_status()
        soup = BeautifulSoup(r.text, "lxml")
        for tag in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
            tag.decompose()
        paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all("p") if len(p.get_text(strip=True)) > 40]
        text = "\n\n".join(paragraphs)[:3000]
        if not text:
            text = soup.get_text(" ", strip=True)[:3000]
        ARTICLE_CACHE[url] = {"timestamp": now, "text": text}
        return {"text": text, "cached": False}
    except Exception as e:
        return {"text": "", "error": str(e)}


# ── Admin endpoints (require admin role) ──────────────────────

@app.get("/admin/analytics", tags=["admin"])
async def admin_analytics(current_user: dict = Depends(auth.require_admin)):
    """Tool call counts, cache hit rate and top queries."""
    return analytics.get_stats()


@app.post("/admin/config", tags=["admin"])
async def admin_config(req: AdminConfigRequest, current_user: dict = Depends(auth.require_admin)):
    """Write env vars to .env and update os.environ. SIMILARITY_THRESHOLD applies immediately."""
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    lines = []
    if os.path.exists(env_path):
        with open(env_path) as f:
            lines = f.readlines()
    updated: set[str] = set()
    new_lines = []
    for line in lines:
        if "=" in line and not line.startswith("#"):
            key = line.split("=", 1)[0].strip()
            if key in req.env:
                new_lines.append(f"{key}={req.env[key]}\n")
                updated.add(key)
                continue
        new_lines.append(line)
    for key, val in req.env.items():
        if key not in updated:
            new_lines.append(f"{key}={val}\n")
    with open(env_path, "w") as f:
        f.writelines(new_lines)
    for key, val in req.env.items():
        os.environ[key] = val
    if "SIMILARITY_THRESHOLD" in req.env:
        import config
        config.SIMILARITY_THRESHOLD = float(req.env["SIMILARITY_THRESHOLD"])
    client_vars = {k for k in req.env if "URL" in k or "KEY" in k}
    return {"ok": True, "restart_required": bool(client_vars)}


@app.get("/admin/rag/sources", tags=["admin"])
async def admin_rag_sources(current_user: dict = Depends(auth.require_admin)):
    """List all indexed RAG source URLs with chunk counts."""
    return {"sources": rag.get_indexed_sources()}


@app.post("/admin/rag/add", tags=["admin"])
async def admin_rag_add(req: RagAddRequest, current_user: dict = Depends(auth.require_admin)):
    """Index a new URL and merge it into the in-memory FAISS index."""
    try:
        n = rag.ingest(req.url)
        return {"ok": True, "chunks": n}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/rag/reindex", tags=["admin"])
async def admin_rag_reindex(req: RagReindexRequest, current_user: dict = Depends(auth.require_admin)):
    """Reindex one URL, or reset and re-ingest all tracked URLs."""
    try:
        if req.url:
            rag.ingest(req.url)
        else:
            urls = rag.get_indexed_urls() or [rag.RAG_URL]
            rag.reset()
            for url in urls:
                rag.ingest(url)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/admin/rag", tags=["admin"])
async def admin_rag_delete(req: RagDeleteRequest, current_user: dict = Depends(auth.require_admin)):
    """Remove a URL from the index (reset + re-ingest remaining URLs)."""
    remaining = [u for u in rag.get_indexed_urls() if u != req.url]
    rag.reset()
    for url in remaining:
        try:
            rag.ingest(url)
        except Exception:
            pass
    return {"ok": True}


@app.delete("/admin/cache", tags=["admin"])
async def admin_cache_clear(current_user: dict = Depends(auth.require_admin)):
    """Truncate the semantic cache (memory + DB) and reset analytics logs."""
    cache.clear()
    analytics.clear_analytics()
    return {"ok": True}


@app.get("/admin/prompt", tags=["admin"])
async def admin_get_prompt(current_user: dict = Depends(auth.require_admin)):
    """Return the current system prompt."""
    return {"prompt": agent.get_system_prompt()}


@app.post("/admin/prompt", tags=["admin"])
async def admin_set_prompt(req: PromptRequest, current_user: dict = Depends(auth.require_admin)):
    """Update the agent system prompt in memory and persist to DB (survives restarts)."""
    agent.set_system_prompt(req.prompt)
    analytics.save_config_value("system_prompt", req.prompt)
    return {"ok": True}


@app.get("/admin/tools", tags=["admin"])
async def admin_get_tools(current_user: dict = Depends(auth.require_admin)):
    """List all tools with their enabled/disabled status."""
    return {"tools": agent.get_tools_status()}


@app.post("/admin/tools/{tool_id}", tags=["admin"])
async def admin_set_tool(
    tool_id: str,
    req: ToolToggleRequest,
    current_user: dict = Depends(auth.require_admin),
):
    """Enable or disable a specific tool. Takes effect on the next chat request."""
    agent.set_tool_enabled(tool_id, req.enabled)
    return {"ok": True}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
