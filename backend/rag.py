import os
import json
import faiss
import numpy as np
import requests
from bs4 import BeautifulSoup
from config import (
    embeddings_client, EMBEDDINGS_MODEL,
    RAG_URL, RAG_CHUNK_SIZE, RAG_CHUNK_OVERLAP,
    FAISS_INDEX_PATH, FAISS_CHUNKS_PATH,
)

_chunks: list[str] = []
_index: faiss.Index | None = None

RAG_SIMILARITY_THRESHOLD = 0.75  # Lower than semantic cache — RAG needs wider recall


def _embed(texts: list[str]) -> np.ndarray:
    response = embeddings_client.embeddings.create(model=EMBEDDINGS_MODEL, input=texts)
    return np.array([r.embedding for r in response.data], dtype=np.float32)


def _embed_single(text: str) -> np.ndarray:
    return _embed([text])[0]


def _scrape(url: str) -> str:
    """Fetch URL and strip nav/footer/scripts to get clean body text."""
    r = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup(["nav", "footer", "script", "style", "header", "aside"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)


def _chunk(text: str, size: int = RAG_CHUNK_SIZE, overlap: int = RAG_CHUNK_OVERLAP) -> list[str]:
    """Split text into overlapping chunks by paragraph then character count."""
    paragraphs = [p.strip() for p in text.split("\n") if len(p.strip()) > 40]
    chunks, current = [], ""
    for para in paragraphs:
        if len(current) + len(para) <= size:
            current += (" " if current else "") + para
        else:
            if current:
                chunks.append(current)
            current = current[-overlap:] + " " + para if overlap and current else para
    if current:
        chunks.append(current)
    return chunks


def _save_to_disk() -> None:
    faiss.write_index(_index, FAISS_INDEX_PATH)
    with open(FAISS_CHUNKS_PATH, "w", encoding="utf-8") as f:
        json.dump(_chunks, f, ensure_ascii=False)


def _load_from_disk() -> bool:
    """Try to load index and chunks from disk. Returns True if successful."""
    global _index, _chunks
    if os.path.exists(FAISS_INDEX_PATH) and os.path.exists(FAISS_CHUNKS_PATH):
        _index = faiss.read_index(FAISS_INDEX_PATH)
        with open(FAISS_CHUNKS_PATH, encoding="utf-8") as f:
            _chunks = json.load(f)
        print(f"[RAG] Loaded {len(_chunks)} chunks from disk")
        return True
    return False


def ingest(url: str = RAG_URL) -> int:
    """Scrape, chunk, embed and persist the target URL. Returns number of chunks."""
    global _chunks, _index
    text = _scrape(url)
    _chunks = _chunk(text)
    if not _chunks:
        raise ValueError(f"No chunks generated from {url}. The page may be too short or blocked.")

    vecs = _embed(_chunks)
    faiss.normalize_L2(vecs)  # Required for IndexFlatIP to act as cosine similarity
    _index = faiss.IndexFlatIP(vecs.shape[1])
    _index.add(vecs)
    _save_to_disk()
    return len(_chunks)


def retrieve(query: str, k: int = 3) -> list[str]:
    """Return top-k relevant chunks, or empty list if below similarity threshold."""
    if _index is None or not _chunks:
        return []
    q_vec = _embed_single(query).reshape(1, -1)
    faiss.normalize_L2(q_vec)
    scores, indices = _index.search(q_vec, k)
    return [
        _chunks[i]
        for i, s in zip(indices[0], scores[0])
        if i >= 0 and s >= RAG_SIMILARITY_THRESHOLD
    ]


# Try to load from disk when the module is imported
_load_from_disk()
