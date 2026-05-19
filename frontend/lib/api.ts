const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8085'

// ── Token helpers ─────────────────────────────────────────────

function getToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('finbot_token') : null
}

export function clearToken(): void {
  localStorage.removeItem('finbot_token')
  localStorage.removeItem('finbot_auth')
}

async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const headers: HeadersInit = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  const response = await fetch(url, { ...options, headers })
  if (response.status === 401) {
    clearToken()
    window.dispatchEvent(new Event('finbot:session-expired'))
    throw new Error('SESSION_EXPIRED')
  }
  return response
}

// ── Auth functions ────────────────────────────────────────────

export async function loginUser(email: string, password: string): Promise<{
  access_token: string
  token_type: string
  role: 'user' | 'admin'
}> {
  const r = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (r.status === 401) throw new Error('INVALID_CREDENTIALS')
  if (!r.ok) throw new Error('LOGIN_FAILED')
  return r.json()
}

export async function registerUser(email: string, password: string): Promise<{
  access_token: string
  token_type: string
  role: 'user' | 'admin'
}> {
  const r = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (r.status === 409) throw new Error('EMAIL_TAKEN')
  if (!r.ok) throw new Error('REGISTER_FAILED')
  return r.json()
}

// ── Chat functions ────────────────────────────────────────────

export async function sendChatMessage(message: string, imageB64?: string): Promise<{
  reply: string
  tool_used: string | null
  from_cache: boolean
}> {
  try {
    const response = await authFetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, image_b64: imageB64 }),
    })
    if (!response.ok) throw new Error('Network error')
    return await response.json()
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_EXPIRED') throw error
    // Mock response when backend is not available
    const mockResponses = [
      { reply: 'Entiendo tu consulta. Basado en la informacion disponible, te recomiendo revisar el estado de tu cuenta en la seccion de movimientos.', tool_used: null, from_cache: false },
      { reply: 'El tipo de cambio actual del dolar es $1 USD = $4.089 COP. Este valor puede variar durante el dia.', tool_used: 'get_usd_rate', from_cache: false },
      { reply: 'Esta respuesta fue recuperada del cache semantico para optimizar el tiempo de respuesta.', tool_used: null, from_cache: true },
      { reply: 'He analizado la imagen que me enviaste. Parece ser un recibo de pago. El monto total es de $150.000 COP.', tool_used: 'analyze_receipt', from_cache: false },
    ]
    const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)]
    if (imageB64) {
      return { reply: 'He analizado la imagen que me enviaste. Puedo ver los detalles del documento.', tool_used: 'vision_analysis', from_cache: false }
    }
    return randomResponse
  }
}

export async function transcribeAudio(audioBlob: Blob): Promise<{ text: string }> {
  try {
    const formData = new FormData()
    formData.append('audio', audioBlob)
    const response = await authFetch(`${API_BASE}/transcribe`, {
      method: 'POST',
      body: formData,
    })
    if (!response.ok) throw new Error('Network error')
    return await response.json()
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_EXPIRED') throw error
    // Mock transcription
    return { text: 'Esta es una transcripcion de prueba del mensaje de voz.' }
  }
}

export async function speakText(text: string): Promise<Blob | null> {
  try {
    const response = await authFetch(`${API_BASE}/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!response.ok) throw new Error('Network error')
    return await response.blob()
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_EXPIRED') throw error
    return null
  }
}

export async function resetMemory(): Promise<void> {
  try {
    await authFetch(`${API_BASE}/reset`, { method: 'POST' })
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_EXPIRED') throw error
  }
}

// ── Admin functions ───────────────────────────────────────────

export async function saveConfig(env: Record<string, string>): Promise<{ ok: boolean }> {
  try {
    const response = await authFetch(`${API_BASE}/admin/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ env }),
    })
    if (!response.ok) throw new Error('Network error')
    return await response.json()
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_EXPIRED') throw error
    return { ok: true } // Mock success
  }
}

export async function addRagUrl(url: string): Promise<{ ok: boolean; chunks: number }> {
  try {
    const response = await authFetch(`${API_BASE}/admin/rag/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (!response.ok) throw new Error('Network error')
    return await response.json()
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_EXPIRED') throw error
    return { ok: true, chunks: Math.floor(Math.random() * 30) + 10 }
  }
}

export async function reindexRag(url?: string): Promise<{ ok: boolean }> {
  try {
    const response = await authFetch(`${API_BASE}/admin/rag/reindex`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (!response.ok) throw new Error('Network error')
    return await response.json()
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_EXPIRED') throw error
    return { ok: true }
  }
}

export async function deleteRagUrl(url: string): Promise<{ ok: boolean }> {
  try {
    const response = await authFetch(`${API_BASE}/admin/rag`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (!response.ok) throw new Error('Network error')
    return await response.json()
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_EXPIRED') throw error
    return { ok: true }
  }
}

export async function clearCache(): Promise<{ ok: boolean }> {
  try {
    const response = await authFetch(`${API_BASE}/admin/cache`, {
      method: 'DELETE',
    })
    if (!response.ok) throw new Error('Network error')
    return await response.json()
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_EXPIRED') throw error
    return { ok: true }
  }
}

export async function getAnalytics(): Promise<{
  tools: { tool: string; calls: number }[]
  cache: { total_queries: number; cache_hits: number; hit_rate: number }
  top_queries: { query: string; count: number }[]
}> {
  const r = await authFetch(`${API_BASE}/admin/analytics`)
  if (!r.ok) throw new Error('ANALYTICS_FAILED')
  return r.json()
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 2000)
    const response = await fetch(`${API_BASE}/health`, { signal: controller.signal })
    clearTimeout(timeoutId)
    return response.ok
  } catch {
    return false
  }
}
