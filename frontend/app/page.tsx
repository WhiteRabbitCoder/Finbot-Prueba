'use client'

import { useState, useEffect, useCallback } from 'react'
import { Message, InputMode, OutputMode, Theme, Settings, View, AuthUser, defaultSettings, themeClasses } from '@/lib/types'
import { sendChatMessage, speakText, checkBackendHealth, clearToken } from '@/lib/api'
import { LoginScreen } from '@/components/login-screen'
import { Onboarding } from '@/components/onboarding'
import { ChatHeader } from '@/components/chat/chat-header'
import { ChatMessages } from '@/components/chat/chat-messages'
import { ChatInput } from '@/components/chat/chat-input'
import { StatusPanel } from '@/components/chat/status-panel'
import { SettingsDrawer } from '@/components/settings-drawer'
import { AdminPanel } from '@/components/admin-panel'
import { FAQView } from '@/components/faq-view'

function generateId() {
  return Math.random().toString(36).substring(2, 9)
}


export default function FinBot() {
  // Auth state
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)

  // Core state
  const [currentView, setCurrentView] = useState<View>('login')
  const [userName, setUserName] = useState('')
  const [theme, setTheme] = useState<Theme>('warm')
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  // Chat state
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [outputMode, setOutputMode] = useState<OutputMode>('text')
  const [isTyping, setIsTyping] = useState(false)
  const [backendAvailable, setBackendAvailable] = useState(false)
  const [prefillInput, setPrefillInput] = useState('')

  // UI state
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [statusPanelVisible, setStatusPanelVisible] = useState(true)
  const [toast, setToast] = useState<string | null>(null)
  const [lang, setLang] = useState<'es' | 'en'>('es')

  // Handle session expiration from any authFetch call
  useEffect(() => {
    const handleExpired = () => {
      setAuthUser(null)
      setMessages([])
      setCurrentView('login')
    }
    window.addEventListener('finbot:session-expired', handleExpired)
    return () => window.removeEventListener('finbot:session-expired', handleExpired)
  }, [])

  // Check auth on mount
  useEffect(() => {
    const run = async () => {
      const storedAuth = localStorage.getItem('finbot_auth')
      const storedToken = localStorage.getItem('finbot_token')

      if (storedAuth && storedToken) {
        // Validate token against backend; on network failure trust localStorage
        try {
          const meResp = await fetch('http://localhost:8000/auth/me', {
            headers: { Authorization: `Bearer ${storedToken}` },
          })
          if (!meResp.ok) {
            localStorage.removeItem('finbot_auth')
            localStorage.removeItem('finbot_token')
            setCurrentView('login')
            setAuthChecked(true)
            return
          }
        } catch {
          // Backend unreachable — allow offline access with cached auth
        }

        try {
          const user = JSON.parse(storedAuth) as AuthUser
          setAuthUser(user)
          const onboardingDone = localStorage.getItem('finbot_onboarding_done')
          const storedName = localStorage.getItem('finbot_user_name')
          if (onboardingDone === 'true' && storedName) {
            setUserName(storedName)
            setCurrentView('chat')
          } else {
            setCurrentView('onboarding')
          }
        } catch {
          setCurrentView('login')
        }
      } else {
        setCurrentView('login')
      }
      setAuthChecked(true)
    }
    run()
  }, [])

  // Load theme and settings from localStorage
  useEffect(() => {
    const storedTheme = localStorage.getItem('finbot_theme') as Theme | null
    const storedSettings = localStorage.getItem('finbot_settings')

    if (storedTheme) {
      setTheme(storedTheme)
    }

    if (storedSettings) {
      try {
        setSettings(JSON.parse(storedSettings))
      } catch {
        // Use defaults
      }
    }

    // Check backend
    checkBackendHealth().then(setBackendAvailable)
  }, [])

  // Apply theme class
  useEffect(() => {
    const html = document.documentElement
    // Remove all theme classes
    Object.values(themeClasses).forEach(cls => {
      if (cls) html.classList.remove(cls)
    })
    // Add current theme class
    const themeClass = themeClasses[theme]
    if (themeClass) {
      html.classList.add(themeClass)
    }
  }, [theme])

  // Save settings to localStorage
  useEffect(() => {
    localStorage.setItem('finbot_settings', JSON.stringify(settings))
  }, [settings])

  const handleLogin = useCallback((user: AuthUser) => {
    setAuthUser(user)
    const onboardingDone = localStorage.getItem('finbot_onboarding_done')
    const storedName = localStorage.getItem('finbot_user_name')
    
    if (onboardingDone === 'true' && storedName) {
      setUserName(storedName)
      setCurrentView('chat')
    } else {
      setCurrentView('onboarding')
    }
  }, [])

  const handleLogout = useCallback(() => {
    clearToken()
    setAuthUser(null)
    setMessages([])
    setCurrentView('login')
  }, [])

  const handleOnboardingComplete = useCallback((name: string, selectedTheme: Theme) => {
    setUserName(name)
    setTheme(selectedTheme)
    localStorage.setItem('finbot_user_name', name)
    localStorage.setItem('finbot_theme', selectedTheme)
    localStorage.setItem('finbot_onboarding_done', 'true')
    setCurrentView('chat')
  }, [])

  const handleThemeChange = useCallback((newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('finbot_theme', newTheme)
  }, [])

  const handleUserNameChange = useCallback((newName: string) => {
    setUserName(newName)
    localStorage.setItem('finbot_user_name', newName)
  }, [])

  const handleSendMessage = useCallback(async (content: string, imageB64?: string) => {
    if (!content.trim() && !imageB64) return

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      imagePreview: imageB64,
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)

    try {
      const response = await sendChatMessage(content, imageB64)

      let audioUrl: string | undefined
      if (outputMode === 'audio') {
        const blob = await speakText(response.reply)
        if (blob) audioUrl = URL.createObjectURL(blob)
      }

      const agentMessage: Message = {
        id: generateId(),
        role: 'agent',
        content: response.reply,
        toolUsed: response.tool_used,
        fromCache: response.from_cache,
        hasImage: !!imageB64,
        timestamp: new Date(),
        isVoiceNote: outputMode === 'audio',
        audioUrl,
      }
      setMessages(prev => [...prev, agentMessage])
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Error desconocido'
      const errorMessage: Message = {
        id: generateId(),
        role: 'agent',
        content: `Error: ${detail}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsTyping(false)
    }
  }, [outputMode])

  const handleNewsClick = useCallback((headline: string) => {
    const message = `Analiza esta noticia y dime que impacto puede tener en mis finanzas personales: "${headline}"`
    handleSendMessage(message)
  }, [handleSendMessage])

  const handleAskFromFAQ = useCallback((prefill: string) => {
    setPrefillInput(prefill)
    setCurrentView('chat')
  }, [])

  const showToast = useCallback((message: string) => {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Wait for auth check
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <div className="w-8 h-8 border-2 border-rule border-t-leaf rounded-full animate-spin" />
      </div>
    )
  }

  // Render based on current view
  if (currentView === 'login') {
    return <LoginScreen onLogin={handleLogin} />
  }

  if (currentView === 'onboarding') {
    return <Onboarding onComplete={handleOnboardingComplete} />
  }

  if (currentView === 'admin') {
    return (
      <AdminPanel
        lang={lang}
        onBack={() => setCurrentView('chat')}
        onShowToast={showToast}
      />
    )
  }

  if (currentView === 'faq') {
    return (
      <FAQView
        onBack={() => setCurrentView('chat')}
        onAskFinBot={handleAskFromFAQ}
      />
    )
  }

  return (
    <div className="h-screen flex flex-col bg-paper">
      <ChatHeader
        lang={lang}
        backendAvailable={backendAvailable}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAdmin={() => setCurrentView('admin')}
        onOpenFAQ={() => setCurrentView('faq')}
        onToggleStatusPanel={() => setStatusPanelVisible(!statusPanelVisible)}
        showStatusPanelButton={settings.showStatusPanel}
        authUser={authUser}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Chat panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatMessages
            lang={lang}
            messages={messages}
            isTyping={isTyping}
            showTimestamps={settings.showTimestamps}
            userName={userName}
            activeToolSteps={[]}
          />
          <ChatInput
            inputMode={inputMode}
            outputMode={outputMode}
            onInputModeChange={setInputMode}
            onOutputModeChange={setOutputMode}
            onSendMessage={handleSendMessage}
            disabled={isTyping}
            prefillValue={prefillInput}
            onPrefillUsed={() => setPrefillInput('')}
          />
        </div>

        {/* Status panel (desktop) */}
        {settings.showStatusPanel && (
          <div className="hidden md:block">
            <StatusPanel
              lang={lang}
              isVisible={statusPanelVisible}
              onClose={() => setStatusPanelVisible(false)}
              onNewsClick={handleNewsClick}
            />
          </div>
        )}

        {/* Status panel (mobile overlay) */}
        {settings.showStatusPanel && statusPanelVisible && (
          <div className="md:hidden fixed inset-0 z-30">
            <div
              className="absolute inset-0 bg-dark/50"
              onClick={() => setStatusPanelVisible(false)}
            />
            <div className="absolute right-0 top-0 bottom-0 animate-slide-in-right">
              <StatusPanel
                lang={lang}
                isVisible={true}
                onClose={() => setStatusPanelVisible(false)}
                onNewsClick={handleNewsClick}
              />
            </div>
          </div>
        )}
      </div>

      {/* Settings drawer */}
      <SettingsDrawer
        lang={lang}
        onLangChange={setLang}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        userName={userName}
        onUserNameChange={handleUserNameChange}
        theme={theme}
        onThemeChange={handleThemeChange}
        settings={settings}
        onSettingsChange={setSettings}
        authUser={authUser}
        onLogout={handleLogout}
      />

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-toast-in">
          <div className="bg-card border border-leaf rounded-xl px-4 py-3 shadow-lg">
            <div className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-leaf">
                <polyline points="20,6 9,17 4,12" />
              </svg>
              <span className="text-sm text-ink">{toast}</span>
            </div>
            <div className="mt-2 h-0.5 bg-leaf/30 rounded overflow-hidden">
              <div className="h-full bg-leaf animate-shrink-width" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
