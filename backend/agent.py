from config import llm_client, vision_client, MODEL, VISION_MODEL
from tools import TOOLS_SCHEMA, execute_tool
import json

# System prompt in English to prevent language contamination.
# The language detection rule is explicit so the model never ignores it.
SYSTEM_PROMPT = """You are FinBot, the official virtual assistant of FinBot, a fintech operating in Colombia and the United States. Tone: formal, financial, clear, no emojis.

DOMAIN: Only personal finance, FinBot products (accounts, CDTs, cards, transfers) and support. Any other topic you decline gracefully.

LANGUAGE: Always detect the language of each user message and respond in that same language. If the message mixes Spanish and English, respond in the dominant language; if balanced 50/50, prefer Spanish.

MEMORY: You remember names, products mentioned, and context throughout the session.

OUT-OF-DOMAIN: "Lo siento, solo puedo ayudarte con temas financieros y de FinBot." (or the English equivalent if the user is writing in English)."""

# Session memory: list of message dicts. Kept as module-level state (single-session).
_messages: list[dict] = []


def _trim_memory() -> None:
    """Keep only the last 7 user+assistant pairs (14 messages) after the system prompt."""
    global _messages
    if len(_messages) > 14:
        _messages = _messages[-14:]


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

    # Tool calling loop — iterate until no more tool_calls in the response
    while True:
        response = active_client.chat.completions.create(
            model=model,
            messages=[{"role": "system", "content": SYSTEM_PROMPT}] + _messages,
            tools=TOOLS_SCHEMA,
            tool_choice="auto",
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
