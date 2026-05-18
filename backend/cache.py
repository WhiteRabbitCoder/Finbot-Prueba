import sqlite3
import numpy as np
from config import embeddings_client, EMBEDDINGS_MODEL, SIMILARITY_THRESHOLD, CACHE_DB_PATH

# In-memory layer for fast lookup during runtime.
# SQLite is the source of truth — loaded into _cache on startup.
_cache: list[dict] = []


def _embed(text: str) -> np.ndarray:
    r = embeddings_client.embeddings.create(model=EMBEDDINGS_MODEL, input=text)
    return np.array(r.data[0].embedding, dtype=np.float32)


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-10))


def _init_db() -> None:
    """Create table if not exists and load all existing entries into _cache."""
    con = sqlite3.connect(CACHE_DB_PATH)
    con.execute("""
        CREATE TABLE IF NOT EXISTS cache (
            id        INTEGER PRIMARY KEY AUTOINCREMENT,
            question  TEXT NOT NULL,
            answer    TEXT NOT NULL,
            embedding BLOB NOT NULL
        )
    """)
    con.commit()
    for q, a, emb_bytes in con.execute("SELECT question, answer, embedding FROM cache"):
        emb = np.frombuffer(emb_bytes, dtype=np.float32).copy()
        _cache.append({"q": q, "a": a, "emb": emb})
    con.close()


def prepopulate(llm_call) -> None:
    """Embed and store the 5 standard FinBot FAQs — skipped if DB already has entries."""
    if _cache:
        print(f"[Cache] Loaded {len(_cache)} entries from {CACHE_DB_PATH}")
        return

    faqs = [
        ("¿Cuál es el horario de atención de FinBot?",
         "FinBot atiende 24/7 a través de nuestros canales digitales. Para soporte humano, nuestros agentes están disponibles de lunes a viernes de 8:00 a.m. a 6:00 p.m. y sábados de 9:00 a.m. a 1:00 p.m."),
        ("¿Cómo recupero mi contraseña?",
         "Para recuperar su contraseña, ingrese a la app FinBot, seleccione '¿Olvidó su contraseña?' e ingrese su número de documento. Recibirá un código de verificación al celular registrado."),
        ("¿Cuánto demora una transferencia?",
         "Las transferencias entre cuentas FinBot son inmediatas. Las transferencias a otras entidades bancarias pueden tardar hasta 1 día hábil dependiendo del banco receptor."),
        ("¿Cuánto cuesta enviar dinero con FinBot?",
         "Las transferencias dentro de FinBot no tienen costo. Las transferencias a otras entidades tienen un costo de $0 hasta 3 transferencias mensuales; a partir de la cuarta, aplica una tarifa de $2.800."),
        ("¿Cómo contacto a soporte de FinBot?",
         "Puede contactar soporte a través del chat en la app, por WhatsApp al +57 300 000 0000, o escribiendo a soporte@finbot.co. También puede llamar a nuestra línea gratuita 01 8000 123 456."),
    ]
    for q, a in faqs:
        store(q, a)
    print(f"[Cache] Pre-populated {len(faqs)} FAQs into {CACHE_DB_PATH}")


def lookup(query: str) -> tuple[str | None, bool]:
    """Check cache before calling the LLM. Returns (answer, from_cache)."""
    if not _cache:
        return None, False
    q_emb = _embed(query)
    sims = [_cosine_sim(q_emb, entry["emb"]) for entry in _cache]
    best_idx = int(np.argmax(sims))
    if sims[best_idx] >= SIMILARITY_THRESHOLD:
        return _cache[best_idx]["a"], True
    return None, False


def store(query: str, answer: str) -> None:
    """Store a question-answer pair in memory and persist to SQLite."""
    emb = _embed(query)
    _cache.append({"q": query, "a": answer, "emb": emb})
    con = sqlite3.connect(CACHE_DB_PATH)
    con.execute(
        "INSERT INTO cache (question, answer, embedding) VALUES (?, ?, ?)",
        (query, answer, emb.tobytes()),
    )
    con.commit()
    con.close()


# Initialize DB and load existing entries when the module is imported
_init_db()
