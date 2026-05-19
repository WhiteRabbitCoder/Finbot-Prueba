'use client'

import Image from 'next/image'
import { AuthUser } from '@/lib/types'
import { useState } from 'react'
import { Lang, translations } from '@/lib/translations'

interface ChatHeaderProps {
  backendAvailable: boolean
  onOpenSettings: () => void
  onOpenAdmin: () => void
  onOpenFAQ: () => void
  onToggleStatusPanel: () => void
  onToggleHistory: () => void
  showStatusPanelButton: boolean
  authUser: AuthUser | null
  lang: Lang
}

export function ChatHeader({
  backendAvailable,
  onOpenSettings,
  onOpenAdmin,
  onOpenFAQ,
  onToggleStatusPanel,
  onToggleHistory,
  showStatusPanelButton,
  authUser,
  lang,
}: ChatHeaderProps) {
  const t = translations[lang]
  const [showTooltip, setShowTooltip] = useState(false)

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  return (
    <header className="sticky top-0 z-10 bg-paper/80 backdrop-blur-sm border-b border-rule">
      {/* Backend warning banner */}
      {!backendAvailable && (
        <div className="bg-pot/20 text-pot px-4 py-2 text-xs text-center">
          {t.backend_banner}
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-3">
        {/* Logo + history toggle */}
        <div className="flex items-center gap-2">
          {/* Hamburger — opens chat history drawer on mobile */}
          <button
            onClick={onToggleHistory}
            className="md:hidden p-1.5 rounded-lg text-ink-muted hover:text-ink hover:bg-card transition-colors"
            aria-label={lang === 'es' ? 'Historial de chats' : 'Chat history'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Image
            src="/logo.png"
            alt="FinBot Logo"
            width={28}
            height={28}
            className="object-contain logo-tinted"
          />
          <span className="font-serif text-lg text-ink">FinBot</span>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${backendAvailable ? 'bg-leaf animate-pulse' : 'bg-ink-muted'}`} />
          <span className="text-xs text-ink-muted">
            {backendAvailable ? t.online_status : t.simulated_badge}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {showStatusPanelButton && (
            <button
              onClick={onToggleStatusPanel}
              className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-card transition-colors md:hidden"
              aria-label={lang === 'es' ? 'Panel de estado' : 'Status panel'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
            </button>
          )}

          {/* FAQ Button */}
          <button
            onClick={onOpenFAQ}
            className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-card transition-colors"
            aria-label={t.faq_button_tooltip}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-card transition-colors"
            aria-label={lang === 'es' ? 'Configuracion' : 'Settings'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {authUser?.role === 'admin' && (
            <button
              onClick={onOpenAdmin}
              className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-card transition-colors"
              aria-label={lang === 'es' ? 'Panel de administracion' : 'Admin panel'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
              </svg>
            </button>
          )}

          {/* User avatar */}
          {authUser && (
            <div className="relative">
              <button
                onClick={onOpenSettings}
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="w-7 h-7 rounded-full bg-ink text-paper text-xs font-medium flex items-center justify-center hover:opacity-90 transition-opacity"
              >
                {getInitials(authUser.name)}
              </button>

              {/* Tooltip */}
              {showTooltip && (
                <div className="absolute right-0 top-full mt-2 bg-card border border-rule rounded-lg p-2 shadow-lg z-50 whitespace-nowrap animate-fade-in">
                  <p className="text-sm text-ink font-medium">{authUser.name}</p>
                  {authUser.email && (
                    <p className="text-xs text-ink-muted">{authUser.email}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
