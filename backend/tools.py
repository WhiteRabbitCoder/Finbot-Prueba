import requests

# Tool 3: CoinGecko — free, no API key required.
COINGECKO_URL = "https://api.coingecko.com/api/v3/simple/price"

# Yahoo Finance chart endpoint — no API key, supports BVC (.CL suffix) and major exchanges.
YF_CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}?interval=1d&range=1d"
YF_HEADERS = {"User-Agent": "Mozilla/5.0"}


def calculate_interest(principal: float, rate: float, years: int) -> dict:
    """Compound interest: P*(1+r)^t. rate must be decimal (8% = 0.08)."""
    final = principal * ((1 + rate) ** years)
    return {
        "monto_final": round(final, 2),
        "intereses_generados": round(final - principal, 2),
    }


def get_usd_rate() -> dict:
    """USD/COP exchange rate. Tries open.er-api.com, then currency-api CDN, falls back to TRM."""
    # Primary: ExchangeRate-API Open Access (free, no key, daily updates)
    try:
        r = requests.get("https://open.er-api.com/v6/latest/USD", timeout=5)
        r.raise_for_status()
        data = r.json()
        if data.get("result") == "success":
            return {"usd_to_cop": round(data["rates"]["COP"], 2), "source": "open.er-api.com"}
    except Exception:
        pass

    # Secondary: fawazahmed0/currency-api via jsDelivr CDN (free, no key)
    try:
        r = requests.get(
            "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
            timeout=5,
        )
        r.raise_for_status()
        return {"usd_to_cop": round(r.json()["usd"]["cop"], 2), "source": "currency-api (CDN)"}
    except Exception:
        pass

    return {"usd_to_cop": 4150.00, "source": "TRM referencia (dato estático)"}


def get_stock_price(symbol: str) -> dict:
    """Live stock price via Yahoo Finance. Supports BVC (.CL), NYSE, NASDAQ."""
    try:
        url = YF_CHART_URL.format(symbol=symbol)
        r = requests.get(url, timeout=8, headers=YF_HEADERS)
        r.raise_for_status()
        data = r.json()
        result = data["chart"]["result"]
        if not result:
            return {"error": f"Ticker '{symbol}' no encontrado en Yahoo Finance."}
        meta = result[0]["meta"]
        price = meta.get("regularMarketPrice")
        if price is None:
            return {"error": f"No hay precio disponible para '{symbol}'."}
        return {
            "symbol": symbol,
            "name": meta.get("shortName") or meta.get("longName") or symbol,
            "price": round(price, 2),
            "currency": meta.get("currency", ""),
            "exchange": meta.get("exchangeName", ""),
        }
    except Exception as e:
        return {"error": f"No se pudo obtener el precio de '{symbol}': {str(e)}"}


def web_search(query: str, max_results: int = 3) -> dict:
    """Web search via DuckDuckGo (no API key). Returns top results with title, url, snippet."""
    try:
        from ddgs import DDGS
        results = []
        with DDGS() as ddgs:
            for hit in ddgs.text(query, max_results=max_results):
                results.append({
                    "title": hit["title"],
                    "url": hit["href"],
                    "snippet": hit["body"],
                })
        if not results:
            return {"error": "No se encontraron resultados para esa búsqueda."}
        return {"results": results}
    except Exception as e:
        return {"error": f"Búsqueda web no disponible: {str(e)}"}


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
            "name": "get_stock_price",
            "description": (
                "Consulta el precio actual de una acción usando Yahoo Finance. "
                "Úsala para acciones de la BVC (Colombia), NYSE o NASDAQ. "
                "Tickers BVC más comunes: BCOLOMBIA.CL (Bancolombia ordinaria), PFBCOLOMBIA.CL (Bancolombia pref.), "
                "ECOPETROL.CL (Ecopetrol), ISA.CL (ISA), GRUPOARGOS.CL. "
                "Tickers NYSE: CIB (Bancolombia), EC (Ecopetrol)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Ticker de Yahoo Finance. Ejemplos: 'BCOLOMBIA.CL', 'CIB', 'ECOPETROL.CL', 'AAPL'",
                    }
                },
                "required": ["symbol"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "Busca información actualizada en la web. "
                "Úsala para noticias, eventos políticos, regulaciones o cualquier dato actual que no tenga una tool dedicada. "
                "No la uses para precios de acciones (usa get_stock_price), tasas de cambio (get_usd_rate) ni criptos (get_crypto_price)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Consulta de búsqueda en lenguaje natural. Sé específico para mejores resultados.",
                    }
                },
                "required": ["query"],
            },
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
    if name == "get_stock_price":
        return get_stock_price(**args)
    if name == "web_search":
        return web_search(**args)
    if name == "get_crypto_price":
        return get_crypto_price(**args)
    return {"error": f"Tool '{name}' no reconocida"}
