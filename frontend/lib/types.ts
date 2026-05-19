export type Theme = 'warm' | 'midnight' | 'coastal' | 'forest' | 'minimal'

export type InputMode = 'text' | 'voice' | 'image'
export type OutputMode = 'text' | 'audio'
export type View = 'login' | 'onboarding' | 'chat' | 'settings' | 'admin' | 'faq'
export type SidebarTab = 'sistema' | 'mercados' | 'noticias'

export interface AuthUser {
  name: string
  email: string
  avatar: string | null
  provider: 'google' | 'email'
  role: 'user' | 'admin'
}

export interface ToolStep {
  id: string
  label: string
  done: boolean
}

export interface Message {
  id: string
  role: 'user' | 'agent'
  content: string
  imagePreview?: string
  toolUsed?: string | null
  fromCache?: boolean
  hasImage?: boolean
  timestamp: Date
  toolSteps?: ToolStep[]
  isVoiceNote?: boolean
  audioUrl?: string
}

export interface Settings {
  showTimestamps: boolean
  autoScroll: boolean
  showStatusPanel: boolean
  autoPlayAudio: boolean
}

export interface FAQ {
  id: string
  question: string
  answer: string
}

export interface RagSource {
  id: string
  url: string
  status: 'indexed' | 'pending' | 'error'
  chunks?: number
}

export interface EnvConfig {
  BASE_URL: string
  API_KEY: string
  LLM_BASE_URL: string
  LLM_API_KEY: string
  MODEL_NAME: string
  VISION_BASE_URL: string
  VISION_API_KEY: string
  VISION_MODEL: string
  EMBEDDINGS_BASE_URL: string
  EMBEDDINGS_API_KEY: string
  EMBEDDINGS_MODEL: string
  STT_BASE_URL: string
  STT_API_KEY: string
  STT_MODEL: string
  TTS_BASE_URL: string
  TTS_API_KEY: string
  TTS_MODEL: string
  TTS_VOICE: string
  SIMILARITY_THRESHOLD: number
  RAG_CHUNK_SIZE: number
  RAG_CHUNK_OVERLAP: number
}

export interface HealthStatus {
  status: string
  rag_chunks: number
  cache_entries: number
  redis_connected: boolean
  models: {
    llm: string
    vision: string
    stt: string
    tts: string
  }
  tools_active: number
}

export interface ExchangeRates {
  rates: Record<string, number>
  updatedAt: Date
}

export interface NewsItem {
  id: string
  source: string
  headline: string
  snippet: string
  timeAgo: string
  url?: string
  clicked?: boolean
}

export const defaultEnvConfig: EnvConfig = {
  BASE_URL: '',
  API_KEY: '',
  LLM_BASE_URL: '',
  LLM_API_KEY: '',
  MODEL_NAME: 'gpt-4o-mini',
  VISION_BASE_URL: '',
  VISION_API_KEY: '',
  VISION_MODEL: 'gpt-4o',
  EMBEDDINGS_BASE_URL: '',
  EMBEDDINGS_API_KEY: '',
  EMBEDDINGS_MODEL: 'text-embedding-3-small',
  STT_BASE_URL: '',
  STT_API_KEY: '',
  STT_MODEL: 'whisper-1',
  TTS_BASE_URL: '',
  TTS_API_KEY: '',
  TTS_MODEL: 'tts-1',
  TTS_VOICE: 'nova',
  SIMILARITY_THRESHOLD: 0.90,
  RAG_CHUNK_SIZE: 500,
  RAG_CHUNK_OVERLAP: 80,
}

export const defaultSettings: Settings = {
  showTimestamps: true,
  autoScroll: true,
  showStatusPanel: true,
  autoPlayAudio: false,
}

export const defaultFAQs: FAQ[] = [
  { id: '1', question: 'Cual es el horario de atencion?', answer: 'FinBot esta disponible las 24 horas, los 7 dias de la semana. Siempre estoy aqui.' },
  { id: '2', question: 'Como recupero mi contrasena?', answer: 'Puedes restablecerla desde el panel de configuracion de tu cuenta de Google vinculada.' },
  { id: '3', question: 'Cuanto tarda una transferencia?', answer: 'El tiempo depende del banco. Por lo general, entre segundos y 24 horas habiles.' },
  { id: '4', question: 'Cual es el costo de envio?', answer: 'FinBot no procesa transferencias directamente. Consulta con tu entidad bancaria.' },
  { id: '5', question: 'Como contacto a soporte?', answer: 'Puedes escribirnos a soporte@finbot.co o iniciar un chat en esta misma interfaz.' },
  { id: '6', question: 'Mis datos estan seguros?', answer: 'Si. No almacenamos conversaciones en servidores externos. Todo corre localmente.' },
  { id: '7', question: 'FinBot puede hacer transferencias por mi?', answer: 'Por ahora no. FinBot es un asistente informativo, no ejecuta operaciones bancarias.' },
  { id: '8', question: 'Que monedas consulta FinBot?', answer: 'USD, EUR, BRL, MXN, PEN y mas, con tasas actualizadas desde open.er-api.com.' },
]

export const themes: Record<Theme, { name: string; description: string; colors: { paper: string; leaf: string; pot: string } }> = {
  warm: {
    name: 'Warm',
    description: 'Acogedor como una tarde en casa',
    colors: { paper: '#FAF1DA', leaf: '#8AC553', pot: '#E8A95C' },
  },
  midnight: {
    name: 'Midnight',
    description: 'Oscuro y elegante, como una boveda',
    colors: { paper: '#1A1308', leaf: '#8AC553', pot: '#E8A95C' },
  },
  coastal: {
    name: 'Coastal',
    description: 'Fresco, tranquilo, lleno de claridad',
    colors: { paper: '#EFF6FF', leaf: '#3B82F6', pot: '#60A5FA' },
  },
  forest: {
    name: 'Forest',
    description: 'Natural, verde, lleno de calma',
    colors: { paper: '#F0FDF4', leaf: '#22C55E', pot: '#86EFAC' },
  },
  minimal: {
    name: 'Minimal',
    description: 'Blanco puro, sin distracciones',
    colors: { paper: '#F8FAFC', leaf: '#64748B', pot: '#94A3B8' },
  },
}

export const themeClasses: Record<Theme, string> = {
  warm: '',
  midnight: 'theme-midnight',
  coastal: 'theme-coastal',
  forest: 'theme-forest',
  minimal: 'theme-minimal',
}

export const mockNews: NewsItem[] = [
  { id: '1', source: 'Bancolombia', headline: 'Dolar cierra por encima de $4.100 por tensiones globales', snippet: 'La moneda estadounidense alcanzo un maximo de tres semanas frente al peso colombiano.', timeAgo: 'hace 5 min' },
  { id: '2', source: 'Portafolio', headline: 'Banco de la Republica mantiene tasa de interes en 9.75%', snippet: 'La junta directiva decidio mantener sin cambios la tasa de referencia.', timeAgo: 'hace 18 min' },
  { id: '3', source: 'Reuters', headline: 'Fed signals potential rate cut in second half of 2026', snippet: 'Federal Reserve officials hinted at possible rate reductions later this year.', timeAgo: 'hace 31 min' },
  { id: '4', source: 'Bloomberg', headline: 'Petroleo Brent sube 1.4% ante reduccion de inventarios OPEP', snippet: 'Los precios del crudo repuntaron tras el informe semanal de la OPEP.', timeAgo: 'hace 47 min' },
  { id: '5', source: 'El Tiempo', headline: 'Inflacion en Colombia baja a 5.8% en abril, la mas baja en dos anios', snippet: 'El DANE reporto una desaceleracion significativa en el indice de precios.', timeAgo: 'hace 1h' },
  { id: '6', source: 'Reuters', headline: 'Bitcoin supera los $105.000 en mercados asiaticos', snippet: 'La criptomoneda alcanzo un nuevo maximo historico en sesiones de Asia.', timeAgo: 'hace 1h 20min' },
  { id: '7', source: 'Portafolio', headline: 'Acciones de Ecopetrol caen 2.1% tras reporte de produccion', snippet: 'Los inversionistas reaccionaron negativamente a las cifras del primer trimestre.', timeAgo: 'hace 2h' },
  { id: '8', source: 'Bloomberg', headline: 'Wall Street cierra en verde; S&P 500 gana 0.6%', snippet: 'Los principales indices estadounidenses terminaron la jornada con ganancias.', timeAgo: 'hace 3h' },
]

export const additionalNews: NewsItem[] = [
  { id: '9', source: 'Reuters', headline: 'Oro alcanza maximo de 6 meses ante incertidumbre geopolitica', snippet: 'El metal precioso se cotiza sobre los $2.400 por onza troy.', timeAgo: 'hace 4h' },
  { id: '10', source: 'Bancolombia', headline: 'Remesas hacia Colombia crecen 8% en primer trimestre', snippet: 'Los envios desde Estados Unidos lideran el incremento.', timeAgo: 'hace 5h' },
  { id: '11', source: 'El Tiempo', headline: 'Gobierno anuncia nuevos incentivos para exportadores', snippet: 'Las medidas buscan fortalecer la balanza comercial del pais.', timeAgo: 'hace 6h' },
]
