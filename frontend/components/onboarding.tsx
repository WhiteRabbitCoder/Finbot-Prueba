'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Theme, themes } from '@/lib/types'

interface OnboardingProps {
  onComplete: (name: string, theme: Theme) => void
  onThemePreview?: (theme: Theme) => void
}

export function Onboarding({ onComplete, onThemePreview }: OnboardingProps) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState('')
  const [selectedTheme, setSelectedTheme] = useState<Theme>('warm')

  const goToNextStep = () => {
    setStep(prev => prev + 1)
  }

  const handleComplete = () => {
    onComplete(name || 'Amigo', selectedTheme)
  }

  const themeEntries = Object.entries(themes) as [Theme, typeof themes.warm][]

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step ? 'bg-ink w-6' : i < step ? 'bg-leaf' : 'bg-rule'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="bg-card rounded-2xl p-8 border border-rule shadow-sm">
          {step === 1 && (
            <div className="animate-slide-left">
              <h1 className="font-serif text-3xl text-ink mb-2">Hola, soy FinBot.</h1>
              <p className="text-ink-muted mb-8">
                Tu asistente financiero bilingue. Antes de empezar, cuentame un poco sobre ti.
              </p>
              <div className="mb-6">
                <label className="block text-sm text-ink-muted mb-2">
                  Como quieres que te llame?
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre o apodo..."
                  className="w-full px-4 py-3 rounded-xl bg-input-bg border border-rule text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-leaf"
                />
              </div>
              <button
                onClick={goToNextStep}
                className="w-full py-3 px-6 bg-ink text-paper font-medium rounded-xl hover:opacity-90 transition-opacity active:scale-[0.98]"
              >
                Continuar
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="animate-slide-left">
              <h2 className="font-serif text-2xl text-ink mb-6">Elige tu ambiente</h2>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {themeEntries.map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => { setSelectedTheme(key); onThemePreview?.(key) }}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedTheme === key
                        ? 'border-leaf bg-agent-bg'
                        : 'border-rule bg-card hover:border-ink-muted'
                    }`}
                  >
                    {/* Color swatches */}
                    <div className="flex gap-1 mb-2">
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: theme.colors.paper }}
                      />
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: theme.colors.leaf }}
                      />
                      <div
                        className="w-6 h-6 rounded"
                        style={{ backgroundColor: theme.colors.pot }}
                      />
                    </div>
                    <p className="font-serif text-sm text-ink">{theme.name}</p>
                    <p className="text-xs text-ink-muted mt-1 line-clamp-2">
                      {theme.description}
                    </p>
                    {selectedTheme === key && (
                      <div className="mt-2 text-leaf text-sm">Seleccionado</div>
                    )}
                  </button>
                ))}
              </div>
              <button
                onClick={goToNextStep}
                className="w-full py-3 px-6 bg-ink text-paper font-medium rounded-xl hover:opacity-90 transition-opacity active:scale-[0.98]"
              >
                Continuar
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="animate-slide-left text-center">
              <div className="mb-6 flex justify-center">
                <div className="animate-hop">
                  <Image
                    src="/logo.png"
                    alt="FinBot Logo"
                    width={64}
                    height={64}
                    className="object-contain logo-tinted"
                  />
                </div>
              </div>
              <h2 className="font-serif text-2xl text-ink mb-2">
                Todo listo, {name || 'Amigo'}.
              </h2>
              <p className="text-ink-muted mb-8">
                FinBot esta listo para ayudarte. Puedes cambiar tus preferencias en cualquier momento desde el panel de ajustes.
              </p>
              <button
                onClick={handleComplete}
                className="w-full py-3 px-6 bg-ink text-paper font-medium rounded-xl hover:opacity-90 transition-opacity active:scale-[0.98]"
              >
                Empezar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
