import uuid
import numpy as np
from config import (
    embeddings_client, EMBEDDINGS_MODEL,
    SIMILARITY_THRESHOLD, REDIS_URL, EMBEDDING_DIM,
)

_redis = None
_INDEX_NAME = "cache_idx"
_PREFIX = "cache:"

_fallback: list[dict] = []


def _embed(text: str) -> np.ndarray:
    r = embeddings_client.embeddings.create(model=EMBEDDINGS_MODEL, input=text)
    return np.array(r.data[0].embedding, dtype=np.float32)


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-10))


def _use_redis() -> bool:
    return _redis is not None


def _create_index() -> None:
    from redis.commands.search.field import VectorField, TextField
    from redis.commands.search.index_definition import IndexDefinition, IndexType

    schema = (
        TextField("question"),
        TextField("answer"),
        VectorField("embedding", "FLAT", {
            "TYPE": "FLOAT32",
            "DIM": EMBEDDING_DIM,
            "DISTANCE_METRIC": "COSINE",
        }),
    )
    try:
        _redis.ft(_INDEX_NAME).create_index(
            schema,
            definition=IndexDefinition(prefix=[_PREFIX], index_type=IndexType.HASH),
        )
        print(f"[Cache] Created RediSearch index '{_INDEX_NAME}'")
    except Exception:
        pass


def init() -> None:
    global _redis
    if not REDIS_URL:
        print("[Cache] No REDIS_URL — using in-memory fallback")
        return
    import redis
    _redis = redis.from_url(REDIS_URL, decode_responses=False)
    _redis.ping()
    _create_index()
    backend = REDIS_URL.split("@")[-1].split("/")[0] if "@" in REDIS_URL else REDIS_URL
    print(f"[Cache] Connected to Redis ({backend})")


def lookup(query: str) -> tuple[str | None, bool]:
    if _use_redis():
        return _lookup_redis(query)
    return _lookup_memory(query)


def store(query: str, answer: str) -> None:
    if _use_redis():
        _store_redis(query, answer)
    else:
        _store_memory(query, answer)


def clear() -> None:
    if _use_redis():
        try:
            _redis.ft(_INDEX_NAME).dropindex(delete_documents=True)
        except Exception:
            pass
        _create_index()
        print("[Cache] Cleared (Redis)")
    else:
        global _fallback
        _fallback = []
        print("[Cache] Cleared (memory)")


def count() -> int:
    if _use_redis():
        try:
            info = _redis.ft(_INDEX_NAME).info()
            return int(info.get("num_docs", info.get(b"num_docs", 0)))
        except Exception:
            return 0
    return len(_fallback)


def prepopulate(llm_call=None) -> None:
    if count() > 0:
        print(f"[Cache] Loaded {count()} existing entries")
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
    print(f"[Cache] Pre-populated {len(faqs)} FAQs")


# ── Redis implementation ─────────────────────────────────────

def _lookup_redis(query: str) -> tuple[str | None, bool]:
    from redis.commands.search.query import Query

    q_emb = _embed(query)
    q = (
        Query("*=>[KNN 1 @embedding $vec AS score]")
        .return_fields("answer", "score")
        .dialect(2)
    )
    results = _redis.ft(_INDEX_NAME).search(q, query_params={"vec": q_emb.tobytes()})
    if results.docs:
        doc = results.docs[0]
        score = float(doc.score if hasattr(doc, "score") else doc["score"])
        similarity = 1 - score
        if similarity >= SIMILARITY_THRESHOLD:
            answer = doc.answer if hasattr(doc, "answer") else doc["answer"]
            if isinstance(answer, bytes):
                answer = answer.decode()
            return answer, True
    return None, False


def _store_redis(query: str, answer: str) -> None:
    emb = _embed(query)
    doc_id = f"{_PREFIX}{uuid.uuid4().hex}"
    _redis.hset(doc_id, mapping={
        "question": query,
        "answer": answer,
        "embedding": emb.tobytes(),
    })


# ── In-memory fallback ───────────────────────────────────────

def _lookup_memory(query: str) -> tuple[str | None, bool]:
    if not _fallback:
        return None, False
    q_emb = _embed(query)
    sims = [_cosine_sim(q_emb, entry["emb"]) for entry in _fallback]
    best_idx = int(np.argmax(sims))
    if sims[best_idx] >= SIMILARITY_THRESHOLD:
        return _fallback[best_idx]["a"], True
    return None, False


def _store_memory(query: str, answer: str) -> None:
    emb = _embed(query)
    _fallback.append({"q": query, "a": answer, "emb": emb})
