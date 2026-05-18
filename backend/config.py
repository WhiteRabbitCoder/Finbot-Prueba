import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# LLM provider — swap BASE_URL to use NVIDIA NIM, Ollama, Groq, etc.
# Any OpenAI-compatible endpoint works without changing any other code.
client = OpenAI(
    base_url=os.getenv("BASE_URL", "https://api.openai.com/v1"),
    api_key=os.getenv("API_KEY", ""),
)

MODEL = os.getenv("MODEL_NAME", "gpt-4o-mini")
VISION_MODEL = os.getenv("VISION_MODEL", "gpt-4o")
EMBEDDINGS_MODEL = os.getenv("EMBEDDINGS_MODEL", "text-embedding-3-small")
STT_MODEL = os.getenv("STT_MODEL", "whisper-1")
TTS_MODEL = os.getenv("TTS_MODEL", "tts-1")
TTS_VOICE = os.getenv("TTS_VOICE", "nova")

RAG_URL = os.getenv("RAG_URL", "https://ayuda.nequi.com.co/preguntas-frecuentes")
RAG_CHUNK_SIZE = int(os.getenv("RAG_CHUNK_SIZE", "500"))
RAG_CHUNK_OVERLAP = int(os.getenv("RAG_CHUNK_OVERLAP", "80"))

SIMILARITY_THRESHOLD = float(os.getenv("SIMILARITY_THRESHOLD", "0.90"))
