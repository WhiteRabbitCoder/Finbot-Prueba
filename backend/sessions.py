import psycopg2
import uuid
from config import DATABASE_URL

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required")


def _connect():
    return psycopg2.connect(DATABASE_URL)


def init_sessions_tables() -> None:
    con = _connect()
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id         TEXT PRIMARY KEY,
            user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title      TEXT NOT NULL DEFAULT 'Nueva conversación',
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id           SERIAL PRIMARY KEY,
            session_id   TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
            role         TEXT NOT NULL,
            content      TEXT,
            tool_used    TEXT,
            from_cache   BOOLEAN DEFAULT FALSE,
            created_at   TIMESTAMP DEFAULT NOW()
        )
    """)
    con.commit()
    con.close()


def create_session(user_id: int, title: str = "Nueva conversación") -> str:
    session_id = str(uuid.uuid4())
    con = _connect()
    cur = con.cursor()
    cur.execute(
        "INSERT INTO chat_sessions (id, user_id, title) VALUES (%s, %s, %s)",
        (session_id, user_id, title),
    )
    con.commit()
    con.close()
    return session_id


def get_sessions(user_id: int) -> list[dict]:
    con = _connect()
    cur = con.cursor()
    cur.execute(
        """
        SELECT id, title, created_at, updated_at
        FROM chat_sessions
        WHERE user_id = %s
        ORDER BY updated_at DESC
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    con.close()
    return [
        {
            "id": r[0],
            "title": r[1],
            "created_at": r[2].isoformat(),
            "updated_at": r[3].isoformat(),
        }
        for r in rows
    ]


def get_session(session_id: str, user_id: int) -> dict | None:
    con = _connect()
    cur = con.cursor()
    cur.execute(
        "SELECT id, title, created_at, updated_at FROM chat_sessions WHERE id = %s AND user_id = %s",
        (session_id, user_id),
    )
    row = cur.fetchone()
    con.close()
    if not row:
        return None
    return {
        "id": row[0],
        "title": row[1],
        "created_at": row[2].isoformat(),
        "updated_at": row[3].isoformat(),
    }


def get_messages(session_id: str, user_id: int) -> list[dict]:
    """Return all messages for a session (ownership verified)."""
    con = _connect()
    cur = con.cursor()
    cur.execute(
        "SELECT id FROM chat_sessions WHERE id = %s AND user_id = %s",
        (session_id, user_id),
    )
    if not cur.fetchone():
        con.close()
        return []
    cur.execute(
        """
        SELECT role, content, tool_used, from_cache, created_at
        FROM chat_messages
        WHERE session_id = %s
        ORDER BY id ASC
        """,
        (session_id,),
    )
    rows = cur.fetchall()
    con.close()
    return [
        {
            "role": r[0],
            "content": r[1],
            "tool_used": r[2],
            "from_cache": r[3],
            "created_at": r[4].isoformat(),
        }
        for r in rows
    ]


def append_message(
    session_id: str,
    role: str,
    content: str,
    tool_used: str | None = None,
    from_cache: bool = False,
) -> None:
    con = _connect()
    cur = con.cursor()
    cur.execute(
        """
        INSERT INTO chat_messages (session_id, role, content, tool_used, from_cache)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (session_id, role, content, tool_used, from_cache),
    )
    cur.execute(
        "UPDATE chat_sessions SET updated_at = NOW() WHERE id = %s",
        (session_id,),
    )
    con.commit()
    con.close()


def set_title(session_id: str, user_id: int, title: str) -> None:
    con = _connect()
    cur = con.cursor()
    cur.execute(
        "UPDATE chat_sessions SET title = %s WHERE id = %s AND user_id = %s",
        (title, session_id, user_id),
    )
    con.commit()
    con.close()


def delete_session(session_id: str, user_id: int) -> None:
    con = _connect()
    cur = con.cursor()
    cur.execute(
        "DELETE FROM chat_sessions WHERE id = %s AND user_id = %s",
        (session_id, user_id),
    )
    con.commit()
    con.close()


def auto_title(msg: str) -> str:
    return msg[:50].strip()
