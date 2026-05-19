'use client'

import { Theme, themes, Settings, AuthUser } from '@/lib/types'
import { Lang, translations } from '@/lib/translations'

interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
  userName: string
  onUserNameChange: (name: string) => void
  theme: Theme
  onThemeChange: (theme: Theme) => void
  settings: Settings
  onSettingsChange: (settings: Settings) => void
  authUser: AuthUser | null
  onLogout: () => void
  lang: Lang
  onLangChange: (lang: Lang) => void
}

export function SettingsDrawer({
  isOpen,
  onClose,
  userName,
  onUserNameChange,
  theme,
  onThemeChange,
  settings,
  onSettingsChange,
  authUser,
  onLogout,
  lang,
  onLangChange,
}: SettingsDrawerProps) {
  const t = translations[lang]
  const themeEntries = Object.entries(themes) as [Theme, typeof themes.warm][]

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'FB'
  }

  const toggleSetting = (key: keyof Settings) => {
    onSettingsChange({ ...settings, [key]: !settings[key] })
  }

  if (!isOpen) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-dark/50 z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-[360px] bg-paper shadow-xl z-50 animate-slide-in-right overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-paper border-b border-rule p-4 flex items-center justify-between">
          <h2 className="font-serif text-xl text-ink">{t.settings_title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-ink-muted hover:text-ink hover:bg-card transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Profile Section */}
          <section>
            <h3 className="font-serif text-sm text-ink-muted mb-4">{t.profile}</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-ink text-paper flex items-center justify-center font-medium">
                {getInitials(userName)}
              </div>
              <div className="flex-1">
                <p className="text-sm text-ink-muted">{t.hello}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={userName}
                    onChange={e => onUserNameChange(e.target.value)}
                    className="text-lg text-ink bg-transparent border-b border-transparent hover:border-rule focus:border-leaf focus:outline-none"
                  />
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-ink-muted">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </div>
                {authUser && (
                  <p className="text-xs text-ink-muted mt-1">
                    {authUser.email || `${lang === 'es' ? 'Modo' : 'Mode'} ${authUser.provider}`}
                  </p>
                )}
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="mt-4 w-full py-2 px-4 border border-ember text-ember text-sm rounded-xl hover:bg-ember/10 transition-colors"
            >
              {t.logout_btn}
            </button>
          </section>

          <hr className="border-rule" />

          {/* Appearance Section */}
          <section>
            <h3 className="font-serif text-sm text-ink-muted mb-4">{t.appearance}</h3>
            
            {/* Theme */}
            <p className="text-sm text-ink mb-3">{t.theme}</p>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {themeEntries.map(([key, themeData]) => (
                <button
                  key={key}
                  onClick={() => onThemeChange(key)}
                  className={`flex-shrink-0 p-2 rounded-xl border-2 transition-all ${
                    theme === key
                      ? 'border-leaf ring-2 ring-leaf/30'
                      : 'border-rule hover:border-ink-muted'
                  }`}
                >
                  <div className="flex gap-0.5 mb-1">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: themeData.colors.paper }}
                    />
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: themeData.colors.leaf }}
                    />
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: themeData.colors.pot }}
                    />
                  </div>
                  <p className="text-xs text-ink text-center">{themeData.name}</p>
                </button>
              ))}
            </div>

            {/* Language */}
            <p className="text-sm text-ink mb-3 mt-4">{t.lang_label}</p>
            <div className="flex gap-2">
              <button
                onClick={() => onLangChange('es')}
                className={`flex-1 py-2 px-4 text-sm rounded-xl transition-all ${
                  lang === 'es'
                    ? 'bg-ink text-paper'
                    : 'bg-card border border-rule text-ink hover:border-ink-muted'
                }`}
              >
                Espanol
              </button>
              <button
                onClick={() => onLangChange('en')}
                className={`flex-1 py-2 px-4 text-sm rounded-xl transition-all ${
                  lang === 'en'
                    ? 'bg-ink text-paper'
                    : 'bg-card border border-rule text-ink hover:border-ink-muted'
                }`}
              >
                English
              </button>
            </div>
          </section>

          <hr className="border-rule" />

          {/* Chat Preferences */}
          <section>
            <h3 className="font-serif text-sm text-ink-muted mb-4">{t.chat_preferences}</h3>
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-ink">{t.show_timestamps}</span>
                <button
                  onClick={() => toggleSetting('showTimestamps')}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    settings.showTimestamps ? 'bg-leaf' : 'bg-rule'
                  }`}
                >
                  <div
                    className={`absolute w-4 h-4 rounded-full bg-paper shadow top-1 transition-transform ${
                      settings.showTimestamps ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-ink">{t.auto_scroll}</span>
                <button
                  onClick={() => toggleSetting('autoScroll')}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    settings.autoScroll ? 'bg-leaf' : 'bg-rule'
                  }`}
                >
                  <div
                    className={`absolute w-4 h-4 rounded-full bg-paper shadow top-1 transition-transform ${
                      settings.autoScroll ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-ink">{t.show_status_panel}</span>
                <button
                  onClick={() => toggleSetting('showStatusPanel')}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    settings.showStatusPanel ? 'bg-leaf' : 'bg-rule'
                  }`}
                >
                  <div
                    className={`absolute w-4 h-4 rounded-full bg-paper shadow top-1 transition-transform ${
                      settings.showStatusPanel ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-ink">{t.auto_play_audio}</span>
                <button
                  onClick={() => toggleSetting('autoPlayAudio')}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    settings.autoPlayAudio ? 'bg-leaf' : 'bg-rule'
                  }`}
                >
                  <div
                    className={`absolute w-4 h-4 rounded-full bg-paper shadow top-1 transition-transform ${
                      settings.autoPlayAudio ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </label>
            </div>
          </section>

          <hr className="border-rule" />

          {/* About */}
          <section>
            <h3 className="font-serif text-sm text-ink-muted mb-4">{t.about}</h3>
            <p className="text-sm text-ink">FinBot v2.1.0</p>
            <p className="text-xs text-ink-muted font-serif italic mt-1">
              Happy bunny hopping for coders
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
