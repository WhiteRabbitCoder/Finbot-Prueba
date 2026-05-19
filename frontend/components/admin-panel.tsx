'use client'

import { useState, useEffect } from 'react'
import { Lang, translations } from '@/lib/translations'
import { getAnalytics } from '@/lib/api'

interface AdminPanelProps {
  onBack: () => void
  onShowToast: (message: string) => void
  lang: Lang
}

interface ToolConfig {
  id: string
  name: string
  description: string
  descriptionEn: string
  enabled: boolean
}

const defaultTools: ToolConfig[] = [
  { id: 'get_usd_rate', name: 'get_usd_rate', description: 'Consulta tipo de cambio en tiempo real', descriptionEn: 'Real-time exchange rate lookup', enabled: true },
  { id: 'web_search', name: 'web_search', description: 'Busqueda web via MCP', descriptionEn: 'Web search via MCP', enabled: true },
  { id: 'analyze_receipt', name: 'analyze_receipt', description: 'Analisis de imagenes y recibos', descriptionEn: 'Image and receipt analysis', enabled: true },
  { id: 'get_news_feed', name: 'get_news_feed', description: 'Feed de noticias economicas', descriptionEn: 'Economic news feed', enabled: true },
  { id: 'semantic_cache', name: 'semantic_cache', description: 'Cache semantico de respuestas', descriptionEn: 'Semantic response cache', enabled: true },
]

const toolCallsData = [
  { name: 'get_usd_rate', calls: 54 },
  { name: 'web_search', calls: 38 },
  { name: 'semantic_cache', calls: 23 },
  { name: 'analyze_receipt', calls: 8 },
  { name: 'get_news_feed', calls: 4 },
]

const topSearchesES = [
  { rank: 1, topic: 'Dolar / Peso colombiano', searches: 34 },
  { rank: 2, topic: 'Tasas Banco de la Republica', searches: 21 },
  { rank: 3, topic: 'Inflacion Colombia 2026', searches: 18 },
  { rank: 4, topic: 'Petroleo Brent', searches: 12 },
  { rank: 5, topic: 'Bitcoin precio hoy', searches: 9 },
]

const topSearchesEN = [
  { rank: 1, topic: 'Dollar / Colombian Peso', searches: 34 },
  { rank: 2, topic: 'Central Bank Rates', searches: 21 },
  { rank: 3, topic: 'Colombia Inflation 2026', searches: 18 },
  { rank: 4, topic: 'Brent Oil', searches: 12 },
  { rank: 5, topic: 'Bitcoin price today', searches: 9 },
]

const DEFAULT_SYSTEM_PROMPT = `Eres FinBot, un asistente financiero bilingue (espanol/ingles).
Ayudas a usuarios a entender tasas de cambio, noticias economicas y conceptos financieros.
Responde siempre de forma clara, calida y sin jerga innecesaria.`

type AnalyticsData = {
  tools: { tool: string; calls: number }[]
  cache: { total_queries: number; cache_hits: number; hit_rate: number }
  top_queries: { query: string; count: number }[]
}

export function AdminPanel({ onBack, onShowToast, lang }: AdminPanelProps) {
  const t = translations[lang]
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const [tools, setTools] = useState<ToolConfig[]>(defaultTools)
  const [barAnimated, setBarAnimated] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    // Load from localStorage
    const storedPrompt = localStorage.getItem('finbot_system_prompt')
    if (storedPrompt) setSystemPrompt(storedPrompt)

    const storedTools = localStorage.getItem('finbot_tools_config')
    if (storedTools) {
      try {
        const parsed = JSON.parse(storedTools)
        setTools(defaultTools.map(tool => ({
          ...tool,
          enabled: parsed[tool.id] ?? tool.enabled,
        })))
      } catch {
        // Use defaults
      }
    }

    // Fetch real analytics from backend (admin only)
    getAnalytics().then(setAnalyticsData).catch(() => {})

    // Trigger bar animation after mount
    setTimeout(() => setBarAnimated(true), 100)
  }, [])

  const handleSavePrompt = () => {
    localStorage.setItem('finbot_system_prompt', systemPrompt)
    onShowToast(lang === 'es' ? 'System prompt guardado' : 'System prompt saved')
  }

  const toggleTool = (id: string) => {
    const updated = tools.map(tool =>
      tool.id === id ? { ...tool, enabled: !tool.enabled } : tool
    )
    setTools(updated)
    
    const configObj = updated.reduce((acc, tool) => {
      acc[tool.id] = tool.enabled
      return acc
    }, {} as Record<string, boolean>)
    localStorage.setItem('finbot_tools_config', JSON.stringify(configObj))
  }

  const activeToolCallsData = analyticsData
    ? analyticsData.tools.map(t => ({ name: t.tool, calls: t.calls }))
    : toolCallsData
  const maxCalls = Math.max(...activeToolCallsData.map(t => t.calls), 1)

  const activeTopSearches = analyticsData
    ? analyticsData.top_queries.map((q, i) => ({ rank: i + 1, topic: q.query, searches: q.count }))
    : (lang === 'es' ? topSearchesES : topSearchesEN)

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-paper border-b border-rule px-4 py-3 flex items-center gap-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-ink-muted hover:text-ink transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          <span className="text-sm">{t.admin_back}</span>
        </button>
        <h1 className="font-serif text-xl text-ink">{t.admin_title}</h1>
      </header>

      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Section A - System Prompt */}
          <section>
            <h2 className="font-serif text-lg text-ink mb-3">{t.system_prompt_label}</h2>
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              className="w-full min-h-[200px] px-3 py-3 text-[13px] font-mono rounded-xl bg-input-bg border border-rule text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-leaf resize-y"
              placeholder="System prompt..."
            />
            <button
              onClick={handleSavePrompt}
              className="w-full mt-3 py-3 bg-ink text-paper font-medium rounded-xl hover:opacity-90 transition-opacity active:scale-[0.99]"
            >
              {t.save_prompt_btn}
            </button>
          </section>

          {/* Section B - Active Tools */}
          <section>
            <h2 className="font-serif text-lg text-ink mb-3">{t.tools_label}</h2>
            <div className="space-y-1">
              {tools.map(tool => (
                <div
                  key={tool.id}
                  className="flex items-center gap-3 py-3 border-b border-rule last:border-b-0"
                >
                  <span className="font-mono text-[13px] text-ink min-w-[140px]">{tool.name}</span>
                  <span className="flex-1 text-xs text-ink-muted">
                    {lang === 'es' ? tool.description : tool.descriptionEn}
                  </span>
                  <button
                    onClick={() => toggleTool(tool.id)}
                    className={`w-10 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0 ${
                      tool.enabled ? 'bg-leaf' : 'bg-rule'
                    }`}
                  >
                    <div
                      className={`absolute w-4 h-4 rounded-full bg-paper shadow top-1 transition-transform duration-200 ${
                        tool.enabled ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Section C - Usage Statistics */}
          <section>
            <h2 className="font-serif text-lg text-ink mb-3">{t.stats_label}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-agent-bg border border-rule rounded-xl p-3">
                <p className="text-xs text-ink-muted mb-1">{t.tokens_consumed}</p>
                <p className="font-serif text-2xl text-ink">48,320</p>
                <p className="text-xs text-ink-muted">{t.estimated_cost}</p>
              </div>
              <div className="bg-agent-bg border border-rule rounded-xl p-3">
                <p className="text-xs text-ink-muted mb-1">{t.tool_calls}</p>
                <p className="font-serif text-2xl text-ink">
                  {analyticsData
                    ? analyticsData.tools.reduce((s, t) => s + t.calls, 0)
                    : 127}
                </p>
                <p className="text-xs text-ink-muted">{t.last_24h}</p>
              </div>
              <div className="bg-agent-bg border border-rule rounded-xl p-3">
                <p className="text-xs text-ink-muted mb-1">{t.cache_hits}</p>
                <p className="font-serif text-2xl text-ink">
                  {analyticsData
                    ? `${Math.round(analyticsData.cache.hit_rate * 100)}%`
                    : '89'}
                </p>
                <p className="text-xs text-ink-muted">{t.hit_rate}</p>
              </div>
              <div className="bg-agent-bg border border-rule rounded-xl p-3">
                <p className="text-xs text-ink-muted mb-1">{t.total_messages}</p>
                <p className="font-serif text-2xl text-ink">
                  {analyticsData ? analyticsData.cache.total_queries : 214}
                </p>
                <p className="text-xs text-ink-muted">{t.current_session}</p>
              </div>
            </div>
          </section>

          {/* Section D - Top Tool Calls Bar Chart */}
          <section>
            <h2 className="font-serif text-lg text-ink mb-3">{t.top_tools_label}</h2>
            <div className="space-y-3">
              {activeToolCallsData.map(tool => (
                <div key={tool.name} className="flex items-center gap-3">
                  <span className="font-mono text-xs text-ink min-w-[120px]">{tool.name}</span>
                  <div className="flex-1 h-2 bg-rule/30 rounded overflow-hidden">
                    <div
                      className="h-full bg-leaf rounded transition-all duration-600 ease-out"
                      style={{
                        width: barAnimated ? `${(tool.calls / maxCalls) * 100}%` : '0%',
                      }}
                    />
                  </div>
                  <span className="text-xs text-ink-muted min-w-[60px] text-right">
                    {tool.calls} {t.calls}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Section E - Most Searched Topics */}
          <section>
            <h2 className="font-serif text-lg text-ink mb-3">{t.top_news_label}</h2>
            <div className="space-y-2">
              {activeTopSearches.map(item => (
                <div key={item.rank} className="flex items-center gap-3 py-2">
                  <span className="font-serif text-lg text-pot w-6">{item.rank}</span>
                  <span className="flex-1 text-sm text-ink">{item.topic}</span>
                  <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-badge-tool-bg text-badge-tool-text border border-badge-tool-border">
                    {item.searches} {t.searches}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
