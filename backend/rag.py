import os
import numpy as np
import requests
import psycopg2
from bs4 import BeautifulSoup
from config import (
    embeddings_client, EMBEDDINGS_MODEL, DATABASE_URL,
    RAG_URL, RAG_CHUNK_SIZE, RAG_CHUNK_OVERLAP, EMBEDDING_DIM,
)

RAG_SIMILARITY_THRESHOLD = 0.75


def _connect():
    return psycopg2.connect(DATABASE_URL)


def _embed(texts: list[str]) -> np.ndarray:
    response = embeddings_client.embeddings.create(model=EMBEDDINGS_MODEL, input=texts)
    return np.array([r.embedding for r in response.data], dtype=np.float32)


def _embed_single(text: str) -> np.ndarray:
    return _embed([text])[0]


def _vec_literal(arr: np.ndarray) -> str:
    return "[" + ",".join(f"{x:.8f}" for x in arr.tolist()) + "]"


def _scrape(url: str) -> str:
    r = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "html.parser")
    for tag in soup(["nav", "footer", "script", "style", "header", "aside"]):
        tag.decompose()
    return soup.get_text(separator="\n", strip=True)


def _chunk(text: str, size: int = RAG_CHUNK_SIZE, overlap: int = RAG_CHUNK_OVERLAP) -> list[str]:
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


def init_tables() -> None:
    if not DATABASE_URL:
        print("[RAG] No DATABASE_URL — RAG disabled")
        return
    con = _connect()
    cur = con.cursor()
    try:
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
        con.commit()
    except Exception:
        con.rollback()
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS rag_chunks (
            id         SERIAL PRIMARY KEY,
            source_url TEXT NOT NULL,
            content    TEXT NOT NULL,
            embedding  vector({EMBEDDING_DIM})
        )
    """)
    cur.execute(f"""
        CREATE TABLE IF NOT EXISTS rag_sources (
            id          SERIAL PRIMARY KEY,
            url         TEXT UNIQUE NOT NULL,
            chunk_count INTEGER DEFAULT 0,
            indexed_at  TIMESTAMP DEFAULT NOW()
        )
    """)
    cur.execute(f"""
        CREATE INDEX IF NOT EXISTS rag_chunks_embedding_idx
        ON rag_chunks USING hnsw (embedding vector_cosine_ops)
    """)
    con.commit()
    con.close()
    print("[RAG] Tables initialized (pgvector)")


def ingest(url: str = RAG_URL) -> int:
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL required for RAG ingest")

    text = _scrape(url)
    chunks = _chunk(text)
    if not chunks:
        raise ValueError(f"No chunks generated from {url}")

    con = _connect()
    cur = con.cursor()

    cur.execute("DELETE FROM rag_chunks WHERE source_url = %s", (url,))

    batch_size = 20
    for i in range(0, len(chunks), batch_size):
        batch_texts = chunks[i:i + batch_size]
        batch_vecs = _embed(batch_texts)
        for chunk_text, vec in zip(batch_texts, batch_vecs):
            cur.execute(
                "INSERT INTO rag_chunks (source_url, content, embedding) VALUES (%s, %s, %s::vector)",
                (url, chunk_text, _vec_literal(vec)),
            )

    cur.execute("""
        INSERT INTO rag_sources (url, chunk_count) VALUES (%s, %s)
        ON CONFLICT (url) DO UPDATE SET chunk_count = EXCLUDED.chunk_count, indexed_at = NOW()
    """, (url, len(chunks)))

    con.commit()
    con.close()
    return len(chunks)


def retrieve(query: str, k: int = 3) -> list[str]:
    if not DATABASE_URL:
        return []
    vec_str = _vec_literal(_embed_single(query))
    con = _connect()
    cur = con.cursor()
    cur.execute("""
        SELECT content
        FROM rag_chunks
        WHERE 1 - (embedding <=> %s::vector) >= %s
        ORDER BY embedding <=> %s::vector
        LIMIT %s
    """, (vec_str, RAG_SIMILARITY_THRESHOLD, vec_str, k))
    results = [row[0] for row in cur.fetchall()]
    con.close()
    return results


def get_indexed_urls() -> list[str]:
    if not DATABASE_URL:
        return []
    con = _connect()
    cur = con.cursor()
    cur.execute("SELECT url FROM rag_sources ORDER BY indexed_at")
    urls = [row[0] for row in cur.fetchall()]
    con.close()
    return urls


def reset() -> None:
    if not DATABASE_URL:
        return
    con = _connect()
    cur = con.cursor()
    cur.execute("TRUNCATE rag_chunks, rag_sources")
    con.commit()
    con.close()
    print("[RAG] Reset — all chunks and sources cleared")


def chunk_count() -> int:
    if not DATABASE_URL:
        return 0
    con = _connect()
    cur = con.cursor()
    cur.execute("SELECT COUNT(*) FROM rag_chunks")
    n = cur.fetchone()[0]
    con.close()
    return n


def is_ready() -> bool:
    if not DATABASE_URL:
        return False
    try:
        con = _connect()
        cur = con.cursor()
        cur.execute("SELECT EXISTS(SELECT 1 FROM rag_chunks)")
        ready = cur.fetchone()[0]
        con.close()
        return ready
    except Exception:
        return False
