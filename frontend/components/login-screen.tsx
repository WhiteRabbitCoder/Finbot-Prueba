'use client'

import { useState } from 'react'
import Image from 'next/image'
import { AuthUser } from '@/lib/types'
import { loginUser, registerUser } from '@/lib/api'

interface LoginScreenProps {
  onLogin: (user: AuthUser) => void
}

function Spinner() {
  return (
    <div className="w-5 h-5 border-2 border-paper/30 border-t-paper rounded-full animate-spin" />
  )
}

type FormMode = 'login' | 'register'

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Credenciales incorrectas. Verifica tu email y contraseña.',
  EMAIL_TAKEN: 'Este email ya está registrado. Intenta iniciar sesión.',
  LOGIN_FAILED: 'Error del servidor. Intenta de nuevo.',
  REGISTER_FAILED: 'Error del servidor. Intenta de nuevo.',
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<FormMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const data = mode === 'login'
        ? await loginUser(email, password)
        : await registerUser(email, password)

      const authUser: AuthUser = {
        name: email.split('@')[0],
        email,
        avatar: null,
        provider: 'email',
        role: data.role,
      }

      localStorage.setItem('finbot_token', data.access_token)
      localStorage.setItem('finbot_auth', JSON.stringify(authUser))
      onLogin(authUser)
    } catch (err) {
      const code = err instanceof Error ? err.message : 'LOGIN_FAILED'
      setError(ERROR_MESSAGES[code] ?? ERROR_MESSAGES.LOGIN_FAILED)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4">
      <div className="w-full max-w-sm bg-agent-bg rounded-2xl border border-rule p-12 text-center shadow-sm">
        {/* Logo */}
        <div className="mb-6 flex justify-center">
          <Image
            src="/logo.png"
            alt="FinBot Logo"
            width={80}
            height={80}
            className="object-contain logo-tinted"
          />
        </div>

        {/* Heading */}
        <h1 className="font-serif text-3xl text-ink mb-3">FinBot</h1>
        <p className="text-sm text-ink-muted leading-relaxed mb-8">
          Tu asistente financiero bilingue. Inicia sesion para continuar.
        </p>

        <div className="text-left">
          {/* Mode tabs */}
          <div className="flex rounded-lg border border-rule overflow-hidden mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null) }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-ink text-paper'
                  : 'bg-transparent text-ink-muted hover:text-ink'
              }`}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError(null) }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                mode === 'register'
                  ? 'bg-ink text-paper'
                  : 'bg-transparent text-ink-muted hover:text-ink'
              }`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl border border-rule bg-paper text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:border-ink transition-colors"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 rounded-xl border border-rule bg-paper text-ink text-sm placeholder:text-ink-muted focus:outline-none focus:border-ink transition-colors"
            />

            {error && (
              <p className="text-xs text-red-500 px-1">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-ink text-paper font-medium rounded-xl hover:opacity-90 transition-opacity active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-70"
            >
              {isLoading ? <Spinner /> : (mode === 'login' ? 'Iniciar sesión' : 'Registrarse')}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
