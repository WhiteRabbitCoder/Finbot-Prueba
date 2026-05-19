'use client'

import { useState, useEffect } from 'react'
import { FAQ, defaultFAQs } from '@/lib/types'

interface FAQViewProps {
  onBack: () => void
  onAskFinBot: (prefill: string) => void
}

export function FAQView({ onBack, onAskFinBot }: FAQViewProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('finbot_faqs')
    if (stored) {
      try {
        setFaqs(JSON.parse(stored))
      } catch {
        setFaqs(defaultFAQs)
      }
    } else {
      setFaqs(defaultFAQs)
    }
  }, [])

  const toggleFaq = (id: string) => {
    setOpenId(openId === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-paper">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-paper/80 backdrop-blur-sm border-b border-rule">
        <div className="px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-ink-muted hover:text-ink transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span className="text-sm">Volver al chat</span>
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-serif text-2xl text-ink mb-2">Preguntas frecuentes</h1>
        <p className="text-sm text-ink-muted mb-8">
          Todo lo que necesitas saber sobre FinBot y tus finanzas.
        </p>

        {/* Accordion */}
        <div className="space-y-3">
          {faqs.map(faq => (
            <div key={faq.id} className="border border-rule rounded-xl overflow-hidden">
              <button
                onClick={() => toggleFaq(faq.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-card/50 transition-colors"
              >
                <span className="text-sm font-medium text-ink pr-4">{faq.question}</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={`w-5 h-5 text-ink-muted flex-shrink-0 transition-transform duration-300 ${
                    openId === faq.id ? 'rotate-180' : ''
                  }`}
                >
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>
              
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: openId === faq.id ? '200px' : '0px' }}
              >
                <div className="p-4 pt-0 border-l-[3px] border-leaf ml-4 mr-4 mb-4">
                  <p className="text-sm text-ink-muted leading-relaxed pl-3">{faq.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Card */}
        <div className="mt-10 bg-card border border-rule rounded-2xl p-6 text-center">
          <p className="text-ink font-medium mb-4">No encontraste tu respuesta?</p>
          <button
            onClick={() => onAskFinBot('Tengo una pregunta: ')}
            className="px-6 py-3 bg-ink text-paper font-medium rounded-xl hover:opacity-90 transition-opacity"
          >
            Preguntale a FinBot
          </button>
        </div>
      </div>
    </div>
  )
}
