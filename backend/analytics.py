import psycopg2
from config import DATABASE_URL

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is required")


def _connect():
    return psycopg2.connect(DATABASE_URL)


def init_agent_config_table() -> None:
    con = _connect()
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS agent_config (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)
    con.commit()
    con.close()


def load_config_value(key: str) -> str | None:
    con = _connect()
    cur = con.cursor()
    cur.execute("SELECT value FROM agent_config WHERE key = %s", (key,))
    row = cur.fetchone()
    con.close()
    return row[0] if row else None


def save_config_value(key: str, value: str) -> None:
    con = _connect()
    cur = con.cursor()
    cur.execute(
        """
        INSERT INTO agent_config (key, value) VALUES (%s, %s)
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
        """,
        (key, value),
    )
    con.commit()
    con.close()


def init_analytics_tables() -> None:
    con = _connect()
    cur = con.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS tool_calls (
            id        SERIAL PRIMARY KEY,
            tool_name TEXT NOT NULL,
            called_at TIMESTAMP DEFAULT NOW()
        )
    """)
    cur.execute("""
        CREATE TABLE IF NOT EXISTS query_log (
            id         SERIAL PRIMARY KEY,
            query      TEXT NOT NULL,
            from_cache BOOLEAN NOT NULL,
            logged_at  TIMESTAMP DEFAULT NOW()
        )
    """)
    con.commit()
    con.close()


def clear_analytics() -> None:
    con = _connect()
    cur = con.cursor()
    cur.execute("TRUNCATE tool_calls, query_log")
    con.commit()
    con.close()


def log_tool_call(tool_name: str) -> None:
    con = _connect()
    cur = con.cursor()
    cur.execute("INSERT INTO tool_calls (tool_name) VALUES (%s)", (tool_name,))
    con.commit()
    con.close()


def log_query(query: str, from_cache: bool) -> None:
    con = _connect()
    cur = con.cursor()
    cur.execute(
        "INSERT INTO query_log (query, from_cache) VALUES (%s, %s)",
        (query, from_cache),
    )
    con.commit()
    con.close()


def get_stats() -> dict:
    con = _connect()
    cur = con.cursor()

    cur.execute("SELECT tool_name, COUNT(*) FROM tool_calls GROUP BY tool_name ORDER BY COUNT(*) DESC")
    tools = [{"tool": r[0], "calls": r[1]} for r in cur.fetchall()]

    cur.execute("SELECT COUNT(*) FROM query_log")
    total = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM query_log WHERE from_cache = %s", (True,))
    hits = cur.fetchone()[0]

    cur.execute(
        "SELECT query, COUNT(*) as freq FROM query_log GROUP BY query ORDER BY freq DESC LIMIT 10"
    )
    top_queries = [{"query": r[0], "count": r[1]} for r in cur.fetchall()]

    con.close()
    return {
        "tools": tools,
        "cache": {
            "total_queries": total,
            "cache_hits": hits,
            "hit_rate": round(hits / total * 100, 1) if total else 0.0,
        },
        "top_queries": top_queries,
    }
