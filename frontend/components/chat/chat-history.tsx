'use client'

import { Session } from '@/lib/types'
import { Lang } from '@/lib/translations'

interface ChatHistoryProps {
  sessions: Session[]
  activeSessionId: string | null
  isLoading: boolean
  onNewChat: () => void
  onSelectSession: (id: string) => void
  onDeleteSession: (id: string) => void
  lang: Lang
}

function groupByDate(sessions: Session[], lang: Lang): { label: string; items: Session[] }[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const weekAgo = new Date(today.getTime() - 6 * 86400000)

  const labels = {
    today:     lang === 'es' ? 'Hoy'          : 'Today',
    yesterday: lang === 'es' ? 'Ayer'         : 'Yesterday',
    week:      lang === 'es' ? 'Esta semana'  : 'This week',
  }

  const groups: Map<string, Session[]> = new Map()
  const order: string[] = []

  for (const s of sessions) {
    const d = new Date(s.updated_at)
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    let label: string
    if (day.getTime() === today.getTime()) {
      label = labels.today
    } else if (day.getTime() === yesterday.getTime()) {
      label = labels.yesterday
    } else if (day >= weekAgo) {
      label = labels.week
    } else {
      label = d.toLocaleDateString(lang === 'es' ? 'es-CO' : 'en-US', { month: 'short', day: 'numeric' })
    }
    if (!groups.has(label)) {
      groups.set(label, [])
      order.push(label)
    }
    groups.get(label)!.push(s)
  }

  return order.map(label => ({ label, items: groups.get(label)! }))
}

export function ChatHistory({
  sessions,
  activeSessionId,
  isLoading,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  lang,
}: ChatHistoryProps) {
  return (
    <div className="w-64 h-full flex flex-col border-r border-rule bg-paper">
      {/* New chat button */}
      <div className="p-3 border-b border-rule">
        <button
          onClick={onNewChat}
          className="w-full py-2 px-4 bg-leaf text-paper font-medium text-sm rounded-xl hover:opacity-90 transition-opacity flex items-center gap-2 justify-center"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {lang === 'es' ? 'Nueva conversación' : 'New chat'}
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto p-2 scrollbar-hide">
        {isLoading ? (
          <div className="space-y-1.5 p-1 mt-1">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-9 rounded-lg bg-card animate-pulse" />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-ink-muted text-center mt-10 px-4 leading-relaxed">
            {lang === 'es' ? 'No hay conversaciones aún' : 'No conversations yet'}
          </p>
        ) : (
          groupByDate(sessions, lang).map(({ label, items }) => (
            <div key={label} className="mb-3">
              <p className="text-[10px] font-medium uppercase tracking-wider text-ink-muted px-2 py-1">
                {label}
              </p>
              <div className="space-y-0.5">
                {items.map(session => (
                  <div
                    key={session.id}
                    onClick={() => onSelectSession(session.id)}
                    className={`group flex items-center gap-1.5 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
                      activeSessionId === session.id
                        ? 'border-l-4 border-leaf bg-card'
                        : 'border-l-4 border-transparent hover:bg-card'
                    }`}
                  >
                    <span className="flex-1 text-sm text-ink truncate leading-snug">
                      {session.title}
                    </span>
                    <button
                      onClick={e => { e.stopPropagation(); onDeleteSession(session.id) }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-ink-muted hover:text-ink transition-all flex-shrink-0"
                      aria-label={lang === 'es' ? 'Eliminar' : 'Delete'}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
