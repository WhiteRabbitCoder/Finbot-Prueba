# FinBot — Simulacro de Automatización con IA

Agente conversacional bilingüe para una fintech (Colombia / EE.UU.), construido como solución a los 8 retos del Simulacro de Práctica de RIWI.

## Stack

- **Backend:** Python 3.11 + FastAPI + OpenAI SDK (base_url configurable por servicio)
- **Frontend:** React 18 + Tailwind CSS + Vite
- **Vector store:** FAISS en disco (sin cuenta externa)
- **Caché semántico:** NeonDB / PostgreSQL con fallback automático a SQLite

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
cp backend/.env.example backend/.env
# Editar .env con tus valores
```

El proyecto no tiene vendor lock-in con OpenAI. Cada servicio tiene su propio `*_BASE_URL` y `*_API_KEY`. Si no están definidos, usan `BASE_URL` / `API_KEY` como fallback global.

```env
# Proveedor global por defecto
BASE_URL=https://api.openai.com/v1
API_KEY=sk-...

# Ejemplos de proveedores por servicio
LLM_BASE_URL=https://api.groq.com/openai/v1          # LLM en Groq
VISION_BASE_URL=https://api.openai.com/v1             # Visión en OpenAI
EMBEDDINGS_BASE_URL=https://integrate.api.nvidia.com/v1  # Embeddings en NVIDIA NIM
STT_BASE_URL=http://localhost:11434/v1                # Whisper local con Ollama
TTS_BASE_URL=https://api.openai.com/v1                # TTS en OpenAI
```

### Base de datos del caché semántico

El caché semántico soporta dos backends con **fallback automático**:

| Variable `DATABASE_URL` | Backend activo |
|-------------------------|----------------|
| Definida | NeonDB / PostgreSQL (cualquier Postgres compatible) |
| Ausente | SQLite local (`cache.db`) |

**Para usar NeonDB:**
1. Crear una cuenta en [neon.tech](https://neon.tech) y un proyecto nuevo
2. Copiar el connection string desde el dashboard
3. Añadir al `.env`:

```env
DATABASE_URL=postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require
```

**Para volver a SQLite:** comentar o eliminar `DATABASE_URL` del `.env`. Sin tocar código.

### 2. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # rellenar API_KEY y ajustar PORT si hace falta
python3 main.py
```

El servidor inicia en el puerto definido en `PORT` (por defecto `8000`).

Al arrancar el servidor imprime el backend activo y el estado de persistencia:

```
[Cache] Using PostgreSQL (NeonDB)      ← o "SQLite (cache.db)" si no hay DATABASE_URL
[Cache] Loaded 12 existing entries     ← si ya había datos; o pre-popula 5 FAQs si es primera vez
[RAG] Loaded 38 chunks from disk       ← si faiss.index existe; o indexa la URL si es primera vez
```

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

| Servicio | Variable | Notas |
|----------|----------|-------|
| LLM / Visión / Embeddings / STT / TTS | `API_KEY` | O usar `*_API_KEY` por servicio |
| CoinGecko | — | Gratuito, sin API key |
| exchangerate.host | — | Gratuito, sin API key |
| NeonDB | `DATABASE_URL` | Opcional — sin ella usa SQLite |
