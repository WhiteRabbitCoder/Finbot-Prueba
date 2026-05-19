from config import llm_client, vision_client, MODEL, VISION_MODEL
from tools import TOOLS_SCHEMA, execute_tool
import json

# System prompt in English to prevent language contamination.
# The language detection rule is explicit so the model never ignores it.
SYSTEM_PROMPT = """You are FinBot, the official virtual assistant of FinBot — a fintech company operating in Colombia and the United States.

ROLE
You are a personal finance specialist. You help users with FinBot products (savings accounts, CDTs, credit and debit cards, domestic and international transfers), exchange rates, investment projections, budgeting, and general financial education.

TONE
Formal, warm, and clear. No emojis. Avoid unnecessary jargon — if a technical term is unavoidable, explain it briefly. Adapt your register to the user: more conversational with casual messages, more precise with technical ones.

INSTRUCTIONS

1. LANGUAGE — Detect the language of each user message and reply in that same language. If the message mixes Spanish and English, respond in the dominant language; if balanced, prefer Spanish.

2. DOMAIN — You are a financial assistant. You cover topics with a clear financial or economic dimension: FinBot products, exchange rates, interest rates, stock prices and market indices (e.g. Bancolombia, Ecopetrol, S&P 500), cryptocurrency prices, commodities (oil, gold), macroeconomic indicators (inflation, GDP), financial news, and political or geopolitical events that directly affect markets or the economy (e.g. elections, trade policy, central bank decisions). Decline any request that has no meaningful financial or economic angle — this includes entertainment, sports, gaming, health, cooking, or general trivia. When declining, be brief and redirect: acknowledge the question is outside your scope and invite the user to ask something finance-related.

3. TOOLS — Use your tools immediately and without waiting to be asked whenever:
   - The user asks for a stock or share price (Colombian BVC, NYSE, NASDAQ, etc.) → use `get_stock_price`.
   - The user asks for the USD/COP rate or dollar price → use `get_usd_rate`.
   - The user asks for a cryptocurrency price → use `get_crypto_price`.
   - The user asks about current events, news, political figures, government decisions, or anything that may have changed recently → use `web_search`.
   - The user asks for an investment or interest projection → use `calculate_interest`.
   Never tell the user "you can consult X site" when you can fetch the answer yourself with a tool.

4. MEMORY — Remember the user's name, products mentioned, financial goals, and prior context across the conversation. Reference past turns naturally ("Como mencionaste antes…", "As you mentioned…").

5. ACCURACY — Never invent financial figures or rates. Always use tools for real-time data. If you are uncertain, say so explicitly and suggest where the user can verify.

6. PRIVACY — Never request or repeat passwords, PINs, full card numbers, or government IDs. If the user shares sensitive data, acknowledge it and firmly advise against sharing such information in chat."""

# Per-session in-memory history: keyed by session_id
_session_memories: dict[str, list] = {}
_disabled_tools: set[str] = set()


def get_system_prompt() -> str:
    return SYSTEM_PROMPT


def set_system_prompt(prompt: str) -> None:
    global SYSTEM_PROMPT
    SYSTEM_PROMPT = prompt


def get_tools_status() -> list[dict]:
    return [
        {
            "id": t["function"]["name"],
            "name": t["function"]["name"],
            "description": t["function"]["description"],
            "enabled": t["function"]["name"] not in _disabled_tools,
        }
        for t in TOOLS_SCHEMA
    ]


def set_tool_enabled(tool_id: str, enabled: bool) -> None:
    if enabled:
        _disabled_tools.discard(tool_id)
    else:
        _disabled_tools.add(tool_id)


def _get_role(msg) -> str:
    if isinstance(msg, dict):
        return msg.get("role", "")
    return getattr(msg, "role", "")


def _trim_memory(msgs: list) -> list:
    """Keep only the last 7 user+assistant pairs (14 messages)."""
    if len(msgs) > 14:
        msgs = msgs[-14:]
        while msgs and _get_role(msgs[0]) != "user":
            msgs.pop(0)
    return msgs


def reset_memory(session_id: str) -> None:
    _session_memories.pop(session_id, None)


def get_loaded_sessions() -> set[str]:
    return set(_session_memories.keys())


def load_memory(session_id: str, messages: list[dict]) -> None:
    """Hydrate session memory from DB records. Expects dicts with 'role' and 'content'."""
    _session_memories[session_id] = [
        {"role": m["role"], "content": m["content"]}
        for m in messages
        if m.get("content")
    ]


def get_memory(session_id: str) -> list:
    return _session_memories.get(session_id, [])


def chat(session_id: str, user_msg: str, image_b64: str | None = None) -> tuple[str, str | None]:
    """
    Send a message to FinBot and return (reply, tool_used).
    Optionally attach a base64-encoded image for vision queries.
    """
    if image_b64:
        content = [
            {"type": "text", "text": user_msg},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}},
        ]
        model = VISION_MODEL
    else:
        content = user_msg
        model = MODEL

    msgs = _session_memories.setdefault(session_id, [])
    msgs.append({"role": "user", "content": content})

    tool_used: str | None = None

    active_client = vision_client if image_b64 else llm_client
    active_tools = [t for t in TOOLS_SCHEMA if t["function"]["name"] not in _disabled_tools]

    while True:
        response = active_client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": SYSTEM_PROMPT}] + msgs,
            tools=active_tools if active_tools else None,
            tool_choice="auto" if active_tools else None,
        )
        msg = response.choices[0].message

        if msg.tool_calls:
            msgs.append(msg)
            for tc in msg.tool_calls:
                tool_used = tc.function.name
                args = json.loads(tc.function.arguments)
                result = execute_tool(tc.function.name, args)
                msgs.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result),
                })
        else:
            reply = msg.content
            msgs.append({"role": "assistant", "content": reply})
            _session_memories[session_id] = _trim_memory(msgs)
            return reply, tool_used
