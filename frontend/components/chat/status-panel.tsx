'use client'

import { useState, useEffect, useRef } from 'react'
import { SidebarTab, NewsItem, HealthStatus } from '@/lib/types'
import { getHealthStatus } from '@/lib/api'
import { Lang, translations, newsES, newsEN } from '@/lib/translations'

interface StatusPanelProps {
  isVisible: boolean
  onClose: () => void
  onNewsClick?: (headline: string) => void
  lang: Lang
}

interface ModuleStatus {
  name: string
  status: 'active' | 'loading' | 'off'
  detail: string
}

const CURRENCY_PAIRS = ['COP', 'EUR', 'BRL', 'MXN', 'PEN', 'ARS']

function StatusDot({ status }: { status: 'active' | 'loading' | 'off' }) {
  const colors = {
    active: 'bg-leaf',
    loading: 'bg-pot animate-pulse',
    off: 'bg-ink-muted opacity-50',
  }
  return <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
}

interface SistemaTabProps {
  lang: Lang
}

function buildModules(health: HealthStatus | null, lang: Lang): ModuleStatus[] {
  const t = translations[lang]
  if (!health) {
    return [
      { name: 'RAG', status: 'loading', detail: '...' },
      { name: 'Cache', status: 'loading', detail: '...' },
      { name: 'Voz', status: 'loading', detail: '...' },
      { name: 'Vision', status: 'loading', detail: '...' },
      { name: 'Tools', status: 'loading', detail: '...' },
    ]
  }
  const cacheDetail = health.redis_connected
    ? `${health.cache_entries} ${t.entries} · Redis`
    : `${health.cache_entries} ${t.entries} · ${t.in_memory}`
  return [
    {
      name: 'RAG',
      status: health.rag_chunks > 0 ? 'active' : 'off',
      detail: health.rag_chunks > 0
        ? `${health.rag_chunks} ${t.chunks_indexed}`
        : t.no_chunks,
    },
    {
      name: 'Cache',
      status: 'active',
      detail: cacheDetail,
    },
    {
      name: 'Voz',
      status: 'active',
      detail: health.models.stt,
    },
    {
      name: 'Vision',
      status: 'active',
      detail: health.models.vision,
    },
    {
      name: 'Tools',
      status: health.tools_active > 0 ? 'active' : 'off',
      detail: `${health.tools_active} ${t.active_tools}`,
    },
  ]
}

function SistemaTab({ lang }: SistemaTabProps) {
  const t = translations[lang]
  const [health, setHealth] = useState<HealthStatus | null>(null)

  useEffect(() => {
    getHealthStatus().then(setHealth)
    const interval = setInterval(() => getHealthStatus().then(setHealth), 30000)
    return () => clearInterval(interval)
  }, [])

  const modules = buildModules(health, lang)

  return (
    <div className="animate-fade-in">
      <div className="divide-y divide-rule">
        {modules.map(module => (
          <div key={module.name} className="flex items-center gap-3 px-4 py-3">
            <StatusDot status={module.status} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ink font-medium">{module.name}</p>
              <p className="text-xs text-ink-muted truncate">{module.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {health && (
        <div className="px-4 py-3 border-t border-rule">
          <p className="text-xs text-ink-muted">{t.llm_model}: <span className="text-ink">{health.models.llm}</span></p>
        </div>
      )}
    </div>
  )
}

interface CurrencyRate {
  pair: string
  rate: number
  change: number | null
}

interface MercadosTabProps {
  lang: Lang
}

function MercadosTab({ lang }: MercadosTabProps) {
  const t = translations[lang]
  const [rates, setRates] = useState<CurrencyRate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const prevRatesRef = useRef<Record<string, number>>({})

  const fetchRates = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('https://open.er-api.com/v6/latest/USD')
      const data = await response.json()

      if (data.result === 'success') {
        const newRates: CurrencyRate[] = CURRENCY_PAIRS.map(currency => {
          const rate: number = data.rates[currency] || 0
          const prev = prevRatesRef.current[currency]
          const change = prev != null && prev !== 0
            ? ((rate - prev) / prev) * 100
            : null
          return { pair: `USD / ${currency}`, rate, change }
        })
        prevRatesRef.current = Object.fromEntries(
          CURRENCY_PAIRS.map(c => [c, data.rates[c] || 0])
        )
        setRates(newRates)
        setLastUpdated(new Date())
        setError(false)
      } else {
        setError(true)
      }
    } catch {
      setError(true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchRates()
    const interval = setInterval(fetchRates, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="p-4 animate-fade-in">
        <div className="space-y-0 divide-y divide-rule">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="py-3 animate-pulse flex items-center justify-between">
              <div className="h-3 bg-rule rounded w-16" />
              <div className="h-5 bg-rule rounded w-20" />
              <div className="h-3 bg-rule rounded w-12" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center animate-fade-in">
        <p className="text-sm text-ink-muted mb-4">
          {lang === 'es' ? 'No se pudo cargar. Intenta de nuevo.' : 'Could not load. Try again.'}
        </p>
        <button
          onClick={fetchRates}
          className="px-4 py-2 bg-ink text-paper text-sm rounded-lg hover:opacity-90 transition-opacity"
        >
          {lang === 'es' ? 'Reintentar' : 'Retry'}
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 animate-fade-in">
      {/* Header with refresh */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-semibold text-ink-muted uppercase tracking-wide">{t.tasas_cambio}</h4>
        <button
          onClick={fetchRates}
          disabled={refreshing}
          className="p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-card transition-colors relative"
        >
          {refreshing && (
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-pot rounded-full animate-pulse" />
          )}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}>
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>
      </div>

      {/* Currency table-like layout */}
      <div className="divide-y divide-rule">
        {rates.map(rate => (
          <div key={rate.pair} className="py-3 flex items-center justify-between">
            <span className="text-xs font-medium text-ink-muted uppercase tracking-wide w-20">{rate.pair}</span>
            <span className="font-serif text-base text-ink flex-1 text-center">
              {rate.rate.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <div className="text-right w-20">
              {rate.change != null ? (
                <p className={`text-xs font-medium ${rate.change >= 0 ? 'text-leaf' : 'text-ember'}`}>
                  {rate.change >= 0 ? '+' : ''}{rate.change.toFixed(3)}%
                </p>
              ) : (
                <p className="text-xs text-ink-muted">—</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {lastUpdated && (
        <p className="text-xs text-ink-muted text-center mt-4">
          {t.fuente} - {t.actualizado} {lastUpdated.toLocaleTimeString(lang === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  )
}

interface NoticiasTabProps {
  onNewsClick?: (headline: string) => void
  lang: Lang
}

function NoticiasTab({ onNewsClick, lang }: NoticiasTabProps) {
  const t = translations[lang]
  const [news, setNews] = useState<NewsItem[]>([])
  const [clickedIds, setClickedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      const newsData = lang === 'es' ? newsES : newsEN
      setNews(newsData.slice(0, 5).map(n => ({
        id: n.id,
        source: n.source,
        headline: n.headline,
        snippet: n.snippet,
        timeAgo: n.timeAgo,
      })))
      setLoading(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [lang])

  const handleNewsClick = (item: NewsItem) => {
    setClickedIds(prev => new Set([...prev, item.id]))
    const prefix = t.analyze_news
    onNewsClick?.(`${prefix} "${item.headline}"`)
  }

  const loadMore = () => {
    const newsData = lang === 'es' ? newsES : newsEN
    const additionalNews = newsData.slice(5).map(n => ({
      id: `extra-${n.id}`,
      source: n.source,
      headline: n.headline,
      snippet: n.snippet,
      timeAgo: n.timeAgo,
    }))
    setNews(prev => [...prev, ...additionalNews])
  }

  if (loading) {
    return (
      <div className="p-4 space-y-0 animate-fade-in divide-y divide-rule">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="py-3 animate-pulse">
            <div className="flex justify-between mb-2">
              <div className="h-3 bg-rule rounded w-16" />
              <div className="h-3 bg-rule rounded w-12" />
            </div>
            <div className="h-4 bg-rule rounded w-full mb-1" />
            <div className="h-3 bg-rule rounded w-3/4" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 animate-fade-in">
      {/* Live indicator */}
      <div className="flex items-center gap-2 mb-4">
        <span className="font-serif text-sm text-ink">{t.economia_vivo}</span>
        <div className="w-2 h-2 bg-ember rounded-full animate-pulse" />
      </div>

      {/* News items - flat list with bottom border, left accent on hover */}
      <div className="divide-y divide-rule">
        {news.map((item, index) => (
          <button
            key={item.id}
            onClick={() => handleNewsClick(item)}
            className={`w-full text-left py-3 transition-all duration-150 animate-fade-in-up relative hover:pl-3 hover:border-l-[3px] hover:border-l-leaf hover:-ml-[3px] ${
              clickedIds.has(item.id) ? 'opacity-70' : ''
            }`}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            {clickedIds.has(item.id) && (
              <div className="absolute top-3 right-0 w-2 h-2 bg-leaf rounded-full" />
            )}
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-pot uppercase">{item.source}</span>
              <span className="text-xs text-ink-muted">{item.timeAgo}</span>
            </div>
            <p className="text-xs font-medium text-ink leading-snug line-clamp-2 mb-1">{item.headline}</p>
            <p className="text-xs text-ink-muted line-clamp-1">{item.snippet}</p>
          </button>
        ))}
      </div>

      {/* Load more */}
      {news.length < 8 && (
        <button
          onClick={loadMore}
          className="w-full mt-4 py-2 text-sm text-leaf hover:underline"
        >
          {t.ver_mas}
        </button>
      )}
    </div>
  )
}

export function StatusPanel({ isVisible, onClose, onNewsClick, lang }: StatusPanelProps) {
  const t = translations[lang]
  const [activeTab, setActiveTab] = useState<SidebarTab>('sistema')

  if (!isVisible) return null

  const tabs: { id: SidebarTab; labelKey: 'sistema' | 'mercados' | 'noticias' }[] = [
    { id: 'sistema', labelKey: 'sistema' },
    { id: 'mercados', labelKey: 'mercados' },
    { id: 'noticias', labelKey: 'noticias' },
  ]

  return (
    <div className="w-72 bg-paper border-l border-rule h-full flex flex-col overflow-hidden">
      {/* Tab bar - flush with top, dark background */}
      <div className="flex bg-ink">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab.id ? 'text-paper' : 'text-paper/60 hover:text-paper/80'
            }`}
          >
            {t[tab.labelKey]}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-leaf" />
            )}
          </button>
        ))}
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="px-3 text-paper/60 hover:text-paper md:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'sistema' && <SistemaTab lang={lang} />}
        {activeTab === 'mercados' && <MercadosTab lang={lang} />}
        {activeTab === 'noticias' && <NoticiasTab onNewsClick={onNewsClick} lang={lang} />}
      </div>
    </div>
  )
}
