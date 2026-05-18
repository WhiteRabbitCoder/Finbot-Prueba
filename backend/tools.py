import requests

# Tool 3: CoinGecko — free, no API key required.
# Chosen because crypto prices are directly relevant to personal finance queries.
COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price"


def calculate_interest(principal: float, rate: float, years: int) -> dict:
    """Compound interest: P*(1+r)^t. rate must be decimal (8% = 0.08)."""
    final = principal * ((1 + rate) ** years)
    return {
        "monto_final": round(final, 2),
        "intereses_generados": round(final - principal, 2),
    }


def get_usd_rate() -> dict:
    """USD/COP exchange rate. Tries exchangerate.host; falls back to hardcoded TRM."""
    try:
        r = requests.get(
            "https://api.exchangerate.host/latest",
            params={"base": "USD", "symbols": "COP"},
            timeout=5,
        )
        r.raise_for_status()
        rate = r.json()["rates"]["COP"]
        return {"usd_to_cop": round(rate, 2), "source": "exchangerate.host"}
    except Exception:
        # Hardcoded TRM fallback — documented intentionally
        return {"usd_to_cop": 4150.00, "source": "TRM referencia (dato estático)"}


def get_crypto_price(coin_id: str) -> dict:
    """Current USD price for a cryptocurrency via CoinGecko (no API key needed)."""
    try:
        r = requests.get(
            COINGECKO_URL,
            params={"ids": coin_id, "vs_currencies": "usd"},
            timeout=8,
        )
        if r.status_code == 429:
            return {"error": "Rate limit de CoinGecko alcanzado. Intenta en unos segundos."}
        r.raise_for_status()
        data = r.json()
        if coin_id not in data:
            return {"error": f"No se encontró el coin '{coin_id}'. Verifica el ID."}
        return {"coin": coin_id, "price_usd": data[coin_id]["usd"]}
    except Exception as e:
        return {"error": f"No se pudo obtener el precio: {str(e)}"}


# OpenAI-format tool schemas — descriptions drive autonomous tool selection
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "calculate_interest",
            "description": (
                "Calcula el interés compuesto y el monto final de una inversión. "
                "Úsala cuando el usuario pregunte por proyecciones, rendimientos o '¿cuánto tendré en X años?'. "
                "Ejemplo: 'Si invierto 10M al 8% anual por 5 años, ¿cuánto tengo?'"
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "principal": {"type": "number", "description": "Monto inicial en la moneda del usuario"},
                    "rate": {"type": "number", "description": "Tasa anual en decimal. 8% = 0.08, 5% = 0.05"},
                    "years": {"type": "integer", "description": "Plazo en años"},
                },
                "required": ["principal", "rate", "years"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_usd_rate",
            "description": (
                "Retorna el tipo de cambio actual USD a COP. "
                "Úsala cuando el usuario pregunte por el precio del dólar, la TRM, o cuánto vale 1 USD en pesos colombianos."
            ),
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_crypto_price",
            "description": (
                "Consulta el precio actual en USD de una criptomoneda en CoinGecko. "
                "Úsala cuando el usuario pregunte por Bitcoin, Ethereum u otras criptos. "
                "El coin_id debe ser el ID de CoinGecko: 'bitcoin', 'ethereum', 'solana', etc."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "coin_id": {
                        "type": "string",
                        "description": "ID de CoinGecko de la criptomoneda. Ejemplos: 'bitcoin', 'ethereum', 'solana'",
                    }
                },
                "required": ["coin_id"],
            },
        },
    },
]


def execute_tool(name: str, args: dict) -> dict:
    if name == "calculate_interest":
        return calculate_interest(**args)
    if name == "get_usd_rate":
        return get_usd_rate()
    if name == "get_crypto_price":
        return get_crypto_price(**args)
    return {"error": f"Tool '{name}' no reconocida"}
