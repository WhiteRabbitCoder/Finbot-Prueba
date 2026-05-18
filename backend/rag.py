import numpy as np
import requests
from bs4 import BeautifulSoup
from config import client, EMBEDDINGS_MODEL, RAG_URL, RAG_CHUNK_SIZE, RAG_CHUNK_OVERLAP

# In-memory FAISS index — rebuilt on server start.
# FAISS local: no account, no signup, no latency from external vector DB.
_chunks: list[str] = []
_embeddings: np.ndarray | None = None

RAG_SIMILARITY_THRESHOLD = 0.75  # Lower than semantic cache — RAG needs wider recall


def _embed(texts: list[str]) -> np.ndarray:
    response = client.embeddings.create(model=EMBEDDINGS_MODEL, input=texts)
    return np.array([r.embedding for r in response.data], dtype=np.float32)


def _embed_single(text: str) -> np.ndarray:
    return _embed([text])[0]


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-10))


def _scrape(url: str) -> str:
    """Fetch URL and strip nav/footer/scripts to get clean body text."""
    r = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup(["nav", "footer", "script", "style", "header", "aside"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)


def _chunk(text: str, size: int = RAG_CHUNK_SIZE, overlap: int = RAG_CHUNK_OVERLAP) -> list[str]:
    """RecursiveCharacterTextSplitter equivalent — split by paragraphs then characters."""
    paragraphs = [p.strip() for p in text.split("\n") if len(p.strip()) > 40]
    chunks, current = [], ""
    for para in paragraphs:
        if len(current) + len(para) <= size:
            current += (" " if current else "") + para
        else:
            if current:
                chunks.append(current)
            # Overlap: carry last `overlap` chars into next chunk
            current = current[-overlap:] + " " + para if overlap and current else para
    if current:
        chunks.append(current)
    return chunks


def ingest(url: str = RAG_URL) -> int:
    """Scrape, chunk, and embed the target URL. Returns number of chunks stored."""
    global _chunks, _embeddings
    text = _scrape(url)
    _chunks = _chunk(text)
    if not _chunks:
        raise ValueError(f"No chunks generated from {url}. The page may be too short or blocked.")
    _embeddings = _embed(_chunks)
    return len(_chunks)


def retrieve(query: str, k: int = 3) -> list[str]:
    """Return top-k relevant chunks, or empty list if below similarity threshold."""
    if _embeddings is None or len(_chunks) == 0:
        return []
    q_emb = _embed_single(query)
    sims = [_cosine_sim(q_emb, emb) for emb in _embeddings]
    top_indices = sorted(range(len(sims)), key=lambda i: sims[i], reverse=True)[:k]
    # Only return chunks above the relevance threshold
    return [_chunks[i] for i in top_indices if sims[i] >= RAG_SIMILARITY_THRESHOLD]
