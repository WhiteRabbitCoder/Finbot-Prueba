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

from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import stt_client, tts_client, STT_MODEL, TTS_MODEL, TTS_VOICE
import agent
import cache
import rag


# ── Lifespan ──────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: pre-populate semantic cache (skipped if DB already has entries)
    cache.prepopulate(lambda q: "")
    # RAG: only ingest if index wasn't loaded from disk
    if rag._index is None:
        try:
            n = rag.ingest()
            print(f"[RAG] Indexed {n} chunks from {rag.RAG_URL}")
        except Exception as e:
            print(f"[RAG] Ingest skipped: {e}")
    yield
    # Shutdown: nothing to clean up


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


class SpeakRequest(BaseModel):
    text: str


# ── Endpoints ─────────────────────────────────────────────────

@app.post("/chat")
async def chat(req: ChatRequest):
    """
    Main chat endpoint. Checks semantic cache first, then RAG context,
    then calls the LLM agent with tool calling support.
    Returns: {reply, tool_used, from_cache}
    """
    # 1. Semantic cache check (skip for image queries — no cache for multimodal)
    if not req.image_b64:
        cached_reply, from_cache = cache.lookup(req.message)
        if from_cache:
            return {"reply": cached_reply, "tool_used": None, "from_cache": True}

    # 2. RAG context injection (skip for image queries)
    user_msg = req.message
    if not req.image_b64:
        chunks = rag.retrieve(req.message)
        if chunks:
            context = "\n\n".join(chunks)
            user_msg = f"Contexto de la web de FinBot:\n{context}\n\nPregunta: {req.message}"

    # 3. LLM agent call (with optional image)
    reply, tool_used = agent.chat(user_msg, req.image_b64)

    # 4. Store new answer in semantic cache if no tool was used and no image
    if not tool_used and not req.image_b64:
        cache.store(req.message, reply)

    return {"reply": reply, "tool_used": tool_used, "from_cache": False}


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """
    Reto 03: Speech-to-Text via Whisper.
    Accepts .mp3, .wav, .ogg, .webm (up to 25 MB).
    """
    audio_bytes = await audio.read()
    if len(audio_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo de audio supera los 25 MB.")

    # Whisper needs a filename with the correct extension to detect the codec
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


@app.post("/speak")
async def speak(req: SpeakRequest):
    """
    Reto 03: Text-to-Speech via OpenAI TTS.
    Returns audio/mpeg binary stream.
    """
    response = tts_client.audio.speech.create(
        model=TTS_MODEL,
        voice=TTS_VOICE,
        input=req.text,
    )
    audio_bytes = response.read()
    return StreamingResponse(io.BytesIO(audio_bytes), media_type="audio/mpeg")


@app.post("/reset")
async def reset():
    """Clear session memory (useful for testing)."""
    agent.reset_memory()
    return {"status": "memory cleared"}


@app.get("/health")
async def health():
    return {"status": "ok", "rag_chunks": len(rag._chunks), "cache_entries": len(cache._cache)}


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
