import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

_DEFAULT_BASE_URL = os.getenv("BASE_URL", "https://api.openai.com/v1")
_DEFAULT_API_KEY  = os.getenv("API_KEY", "")


def _client(base_url_var: str, api_key_var: str) -> OpenAI:
    """
    Build an OpenAI-compatible client for one service.
    Falls back to BASE_URL / API_KEY when the service-specific vars are unset.
    """
    return OpenAI(
        base_url=os.getenv(base_url_var) or _DEFAULT_BASE_URL,
        api_key=os.getenv(api_key_var)  or _DEFAULT_API_KEY,
    )


# One client per service — each can point to a different provider independently.
llm_client        = _client("LLM_BASE_URL",        "LLM_API_KEY")
vision_client     = _client("VISION_BASE_URL",      "VISION_API_KEY")
embeddings_client = _client("EMBEDDINGS_BASE_URL",  "EMBEDDINGS_API_KEY")
stt_client        = _client("STT_BASE_URL",         "STT_API_KEY")
tts_client        = _client("TTS_BASE_URL",         "TTS_API_KEY")

# Model names
MODEL            = os.getenv("MODEL_NAME",        "gpt-4o-mini")
VISION_MODEL     = os.getenv("VISION_MODEL",      "gpt-4o")
EMBEDDINGS_MODEL = os.getenv("EMBEDDINGS_MODEL",  "text-embedding-3-small")
STT_MODEL        = os.getenv("STT_MODEL",         "whisper-1")
TTS_MODEL        = os.getenv("TTS_MODEL",         "tts-1")
TTS_VOICE        = os.getenv("TTS_VOICE",         "nova")

# RAG
RAG_URL          = os.getenv("RAG_URL", "https://ayuda.nequi.com.co/preguntas-frecuentes")
RAG_CHUNK_SIZE   = int(os.getenv("RAG_CHUNK_SIZE",   "500"))
RAG_CHUNK_OVERLAP= int(os.getenv("RAG_CHUNK_OVERLAP", "80"))

SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.90"))

# Persistence paths
CACHE_DB_PATH     = os.getenv("CACHE_DB_PATH",     "cache.db")
FAISS_INDEX_PATH  = os.getenv("FAISS_INDEX_PATH",  "faiss.index")
FAISS_CHUNKS_PATH = os.getenv("FAISS_CHUNKS_PATH", "faiss_chunks.json")
