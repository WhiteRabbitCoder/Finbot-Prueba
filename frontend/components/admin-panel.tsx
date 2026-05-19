'use client'

import { useState, useEffect } from 'react'
import { Lang, translations } from '@/lib/translations'
import {
  getAnalytics,
  getSystemPrompt,
  saveSystemPrompt,
  getAdminTools,
  setToolEnabled,
  clearCache,
  addRagUrl,
  reindexRag,
} from '@/lib/api'

interface AdminPanelProps {
  onBack: () => void
  onShowToast: (message: string) => void
  lang: Lang
}

interface ToolConfig {
  id: string
  name: string
  description: string
  enabled: boolean
}

type AnalyticsData = {
  tools: { tool: string; calls: number }[]
  cache: { total_queries: number; cache_hits: number; hit_rate: number }
  top_queries: { query: string; count: number }[]
}

export function AdminPanel({ onBack, onShowToast, lang }: AdminPanelProps) {
  const t = translations[lang]

  const [systemPrompt, setSystemPrompt] = useState('')
  const [promptLoading, setPromptLoading] = useState(true)
  const [savingPrompt, setSavingPrompt] = useState(false)

  const [tools, setTools] = useState<ToolConfig[]>([])
  const [toolsLoading, setToolsLoading] = useState(true)

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [barAnimated, setBarAnimated] = useState(false)

  const [ragUrl, setRagUrl] = useState('')
  const [ragLoading, setRagLoading] = useState(false)

  const [clearingCache, setClearingCache] = useState(false)

  useEffect(() => {
    getSystemPrompt()
      .then(setSystemPrompt)
      .catch(() => {})
      .finally(() => setPromptLoading(false))

    getAdminTools()
      .then(setTools)
      .catch(() => {})
      .finally(() => setToolsLoading(false))

    getAnalytics()
      .then(setAnalyticsData)
      .catch(() => {})

    setTimeout(() => setBarAnimated(true), 100)
  }, [])

  const handleSavePrompt = async () => {
    setSavingPrompt(true)
    try {
      await saveSystemPrompt(systemPrompt)
      onShowToast(lang === 'es' ? 'System prompt actualizado' : 'System prompt updated')
    } catch {
      onShowToast(lang === 'es' ? 'Error al guardar' : 'Save failed')
    } finally {
      setSavingPrompt(false)
    }
  }

  const handleToggleTool = async (id: string) => {
    const tool = tools.find(t => t.id === id)
    if (!tool) return
    const newEnabled = !tool.enabled
    setTools(prev => prev.map(t => t.id === id ? { ...t, enabled: newEnabled } : t))
    try {
      await setToolEnabled(id, newEnabled)
      onShowToast(
        newEnabled
          ? (lang === 'es' ? 'Herramienta activada' : 'Tool enabled')
          : (lang === 'es' ? 'Herramienta desactivada' : 'Tool disabled')
      )
    } catch {
      setTools(prev => prev.map(t => t.id === id ? { ...t, enabled: !newEnabled } : t))
      onShowToast(lang === 'es' ? 'Error al cambiar herramienta' : 'Toggle failed')
    }
  }

  const handleClearCache = async () => {
    setClearingCache(true)
    try {
      await clearCache()
      onShowToast(lang === 'es' ? 'Cache limpiado' : 'Cache cleared')
      getAnalytics().then(setAnalyticsData).catch(() => {})
    } catch {
      onShowToast(lang === 'es' ? 'Error al limpiar cache' : 'Clear failed')
    } finally {
      setClearingCache(false)
    }
  }

  const handleAddRagUrl = async () => {
    if (!ragUrl.trim()) return
    setRagLoading(true)
    try {
      const result = await addRagUrl(ragUrl.trim())
      onShowToast(
        lang === 'es'
          ? `URL indexada (${result.chunks} chunks)`
          : `URL indexed (${result.chunks} chunks)`
      )
      setRagUrl('')
    } catch {
      onShowToast(lang === 'es' ? 'Error al indexar URL' : 'Indexing failed')
    } finally {
      setRagLoading(false)
    }
  }

  const handleReindexAll = async () => {
    setRagLoading(true)
    try {
      await reindexRag()
      onShowToast(lang === 'es' ? 'Re-indexado completado' : 'Re-index complete')
    } catch {
      onShowToast(lang === 'es' ? 'Error al re-indexar' : 'Re-index failed')
    } finally {
      setRagLoading(false)
    }
  }

  const toolCallsData = analyticsData?.tools.map(t => ({ name: t.tool, calls: t.calls })) ?? []
  const maxCalls = Math.max(...toolCallsData.map(t => t.calls), 1)
  const topSearches = analyticsData?.top_queries.map((q, i) => ({ rank: i + 1, topic: q.query, count: q.count })) ?? []
  const hitRate = analyticsData ? Math.round(analyticsData.cache.hit_rate) : null
  const totalCalls = analyticsData ? analyticsData.tools.reduce((s, t) => s + t.calls, 0) : null
  const totalQueries = analyticsData?.cache.total_queries ?? null

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

        {/* ── Left Column ─────────────────────────────────── */}
        <div className="space-y-6">

          {/* System Prompt */}
          <section>
            <h2 className="font-serif text-lg text-ink mb-3">{t.system_prompt_label}</h2>
            {promptLoading ? (
              <div className="h-48 rounded-xl bg-card border border-rule animate-pulse" />
            ) : (
              <>
                <textarea
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  className="w-full min-h-[200px] px-3 py-3 text-[13px] font-mono rounded-xl bg-input-bg border border-rule text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-leaf resize-y"
                  placeholder="System prompt..."
                />
                <button
                  onClick={handleSavePrompt}
                  disabled={savingPrompt}
                  className="w-full mt-3 py-3 bg-ink text-paper font-medium rounded-xl hover:opacity-90 transition-opacity active:scale-[0.99] disabled:opacity-60"
                >
                  {savingPrompt
                    ? (lang === 'es' ? 'Guardando...' : 'Saving...')
                    : t.save_prompt_btn}
                </button>
              </>
            )}
          </section>

          {/* Active Tools */}
          <section>
            <h2 className="font-serif text-lg text-ink mb-3">{t.tools_label}</h2>
            {toolsLoading ? (
              <div className="h-32 rounded-xl bg-card border border-rule animate-pulse" />
            ) : tools.length === 0 ? (
              <p className="text-sm text-ink-muted">
                {lang === 'es' ? 'No se pudieron cargar las herramientas.' : 'Could not load tools.'}
              </p>
            ) : (
              <div className="space-y-1">
                {tools.map(tool => (
                  <div
                    key={tool.id}
                    className="flex items-center gap-3 py-3 border-b border-rule last:border-b-0"
                  >
                    <span className="font-mono text-[13px] text-ink min-w-[160px]">{tool.name}</span>
                    <span className="flex-1 text-xs text-ink-muted line-clamp-1">
                      {tool.description.split('.')[0]}
                    </span>
                    <button
                      onClick={() => handleToggleTool(tool.id)}
                      className={`w-10 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0 ${
                        tool.enabled ? 'bg-leaf' : 'bg-rule'
                      }`}
                      aria-label={tool.enabled ? 'Disable' : 'Enable'}
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
            )}
          </section>

          {/* Cache Management */}
          <section>
            <h2 className="font-serif text-lg text-ink mb-3">{t.cache_section_label}</h2>
            <button
              onClick={handleClearCache}
              disabled={clearingCache}
              className="w-full py-3 bg-pot/10 text-pot border border-pot/20 font-medium rounded-xl hover:bg-pot/20 transition-colors active:scale-[0.99] disabled:opacity-60"
            >
              {clearingCache
                ? (lang === 'es' ? 'Limpiando...' : 'Clearing...')
                : t.cache_clear_btn}
            </button>
          </section>

        </div>

        {/* ── Right Column ─────────────────────────────────── */}
        <div className="space-y-6">

          {/* Usage Statistics */}
          <section>
            <h2 className="font-serif text-lg text-ink mb-3">{t.stats_label}</h2>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-agent-bg border border-rule rounded-xl p-3">
                <p className="text-xs text-ink-muted mb-1">{t.tool_calls}</p>
                <p className="font-serif text-2xl text-ink">
                  {totalCalls !== null ? totalCalls : '—'}
                </p>
                <p className="text-xs text-ink-muted">{t.last_24h}</p>
              </div>
              <div className="bg-agent-bg border border-rule rounded-xl p-3">
                <p className="text-xs text-ink-muted mb-1">{t.cache_hits}</p>
                <p className="font-serif text-2xl text-ink">
                  {hitRate !== null ? `${hitRate}%` : '—'}
                </p>
                <p className="text-xs text-ink-muted">{t.hit_rate}</p>
              </div>
              <div className="bg-agent-bg border border-rule rounded-xl p-3">
                <p className="text-xs text-ink-muted mb-1">{t.total_messages}</p>
                <p className="font-serif text-2xl text-ink">
                  {totalQueries !== null ? totalQueries : '—'}
                </p>
                <p className="text-xs text-ink-muted">{t.current_session}</p>
              </div>
            </div>
          </section>

          {/* Top Tool Calls Bar Chart */}
          {toolCallsData.length > 0 && (
            <section>
              <h2 className="font-serif text-lg text-ink mb-3">{t.top_tools_label}</h2>
              <div className="space-y-3">
                {toolCallsData.map(tool => (
                  <div key={tool.name} className="flex items-center gap-3">
                    <span className="font-mono text-xs text-ink min-w-[140px]">{tool.name}</span>
                    <div className="flex-1 h-2 bg-rule/30 rounded overflow-hidden">
                      <div
                        className="h-full bg-leaf rounded transition-all duration-600 ease-out"
                        style={{ width: barAnimated ? `${(tool.calls / maxCalls) * 100}%` : '0%' }}
                      />
                    </div>
                    <span className="text-xs text-ink-muted min-w-[50px] text-right">
                      {tool.calls} {t.calls}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Top Queries */}
          {topSearches.length > 0 && (
            <section>
              <h2 className="font-serif text-lg text-ink mb-3">{t.top_queries_label}</h2>
              <div className="space-y-2">
                {topSearches.map(item => (
                  <div key={item.rank} className="flex items-center gap-3 py-2">
                    <span className="font-serif text-lg text-pot w-6">{item.rank}</span>
                    <span className="flex-1 text-sm text-ink truncate">{item.topic}</span>
                    <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-badge-tool-bg text-badge-tool-text border border-badge-tool-border flex-shrink-0">
                      {item.count} {t.searches}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* RAG Management */}
          <section>
            <h2 className="font-serif text-lg text-ink mb-3">{t.rag_label}</h2>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="url"
                  value={ragUrl}
                  onChange={e => setRagUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddRagUrl()}
                  placeholder={t.rag_url_placeholder}
                  disabled={ragLoading}
                  className="flex-1 px-3 py-2 text-sm rounded-xl bg-input-bg border border-rule text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-leaf disabled:opacity-50"
                />
                <button
                  onClick={handleAddRagUrl}
                  disabled={ragLoading || !ragUrl.trim()}
                  className="px-4 py-2 bg-ink text-paper text-sm font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {t.rag_add_btn}
                </button>
              </div>
              <button
                onClick={handleReindexAll}
                disabled={ragLoading}
                className="w-full py-2 text-sm border border-rule text-ink-muted hover:text-ink hover:border-ink transition-colors rounded-xl disabled:opacity-50"
              >
                {ragLoading
                  ? (lang === 'es' ? 'Procesando...' : 'Processing...')
                  : t.rag_reindex_btn}
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
