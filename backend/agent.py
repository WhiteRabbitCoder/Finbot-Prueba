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

# Session memory: list of message dicts. Kept as module-level state (single-session).
_messages: list[dict] = []
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


def _trim_memory() -> None:
    """Keep only the last 7 user+assistant pairs (14 messages) after the system prompt."""
    global _messages
    if len(_messages) > 14:
        _messages = _messages[-14:]
        # Drop leading messages until we reach a user turn so no tool result
        # appears without its preceding assistant tool_calls message.
        while _messages and _messages[0].get("role") != "user":
            _messages.pop(0)


def reset_memory() -> None:
    global _messages
    _messages = []


def chat(user_msg: str, image_b64: str | None = None) -> tuple[str, str | None]:
    """
    Send a message to FinBot and return (reply, tool_used).
    Optionally attach a base64-encoded image for vision queries.
    """
    # Build content: text-only or multimodal
    if image_b64:
        content = [
            {"type": "text", "text": user_msg},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}},
        ]
        model = VISION_MODEL
    else:
        content = user_msg
        model = MODEL

    _messages.append({"role": "user", "content": content})

    tool_used: str | None = None

    active_client = vision_client if image_b64 else llm_client
    active_tools = [t for t in TOOLS_SCHEMA if t["function"]["name"] not in _disabled_tools]

    # Tool calling loop — iterate until no more tool_calls in the response
    while True:
        response = active_client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": SYSTEM_PROMPT}] + _messages,
            tools=active_tools if active_tools else None,
            tool_choice="auto" if active_tools else None,
        )
        msg = response.choices[0].message

        if msg.tool_calls:
            # Execute each tool call and feed results back
            _messages.append(msg)
            for tc in msg.tool_calls:
                tool_used = tc.function.name
                args = json.loads(tc.function.arguments)
                result = execute_tool(tc.function.name, args)
                _messages.append({
                    "role": "tool",
                    "tool_call_id": tc.id,
                    "content": json.dumps(result),
                })
        else:
            reply = msg.content
            _messages.append({"role": "assistant", "content": reply})
            _trim_memory()
            return reply, tool_used
