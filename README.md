# FinBot — Simulacro de Automatización con IA

Agente conversacional bilingüe para una fintech (Colombia / EE.UU.), construido como solución a los 8 retos del Simulacro de Práctica de RIWI.

## Stack

- **Backend:** Python 3.11 + FastAPI + OpenAI SDK (base_url configurable)
- **Frontend:** React 18 + Tailwind CSS + Vite
- **Vector store:** FAISS local (sin cuenta externa)
- **Cache semántico:** numpy (implementación desde cero)

## Retos implementados

| # | Reto | Estado |
|---|------|--------|
| 01 | Agente bilingüe con personalidad definida | ✅ |
| 02 | 3 tools: calculate_interest, get_usd_rate, get_crypto_price | ✅ |
| 03 | Pipeline de voz: Whisper STT + TTS | ✅ |
| 04 | RAG sobre una web real (FAISS local) | ✅ |
| 05 | Visión: análisis de imágenes (multimodal) | ✅ |
| 06 | Caché semántico para FAQs frecuentes | ✅ |
| 07 | App web con indicadores visuales de tools y caché | ✅ |
| 08 | Reto integrador: secuencia end-to-end | ✅ |

## Configuración

### 1. Variables de entorno

```bash
cp .env.example .env
# Editar .env con tus valores
```

El proyecto no tiene vendor lock-in con OpenAI. Para cambiar de proveedor, solo edita `BASE_URL`:

```env
# NVIDIA NIM
BASE_URL=https://integrate.api.nvidia.com/v1

# Ollama (local)
BASE_URL=http://localhost:11434/v1
API_KEY=ollama

# Groq
BASE_URL=https://api.groq.com/openai/v1
```

### 2. Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

El servidor inicia en `http://localhost:8000`.

Al arrancar:
- Pre-popula el caché semántico con 5 FAQs de FinBot
- Indexa el contenido de `RAG_URL` en FAISS

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

La app abre en `http://localhost:5173`.

## Endpoints disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/chat` | Chat principal (texto + imagen opcional) |
| POST | `/transcribe` | Audio → texto (Whisper) |
| POST | `/speak` | Texto → audio (TTS) |
| POST | `/reset` | Limpiar memoria de sesión |
| GET | `/health` | Estado del servidor, chunks RAG y entradas de caché |

## Respuesta del endpoint /chat

```json
{
  "reply": "El Bitcoin está actualmente a $67,450 USD.",
  "tool_used": "get_crypto_price",
  "from_cache": false
}
```

- `tool_used`: nombre de la tool activada, o `null`
- `from_cache`: `true` si la respuesta vino del caché semántico (sin llamar al LLM)

## Secuencia de prueba end-to-end (Reto 08)

1. `"Hola, soy Daniela, analista financiera"` → tono formal ES, recuerda nombre
2. `"What is the current USD to COP rate?"` → badge get_usd_rate
3. `"¿Cuál es el horario de atención de FinBot?"` → badge ⚡ Caché
4. Imagen extracto + `"¿cuánto gasté en restaurantes?"` → análisis visual
5. Voz → `"¿Cómo está el Bitcoin hoy?"` → transcripción + badge get_crypto_price
6. `"Según la web de FinBot, ¿cuáles son los CDTs disponibles?"` → respuesta RAG
7. Audio out + `"Summarize what we discussed today"` → resumen EN + audio
8. `"¿Recuerdas cómo me llamo?"` → responde "Daniela"

## API keys necesarias

- `API_KEY`: requerida para el LLM principal y embeddings
- CoinGecko: gratuito, sin API key
- exchangerate.host: gratuito, sin API key
