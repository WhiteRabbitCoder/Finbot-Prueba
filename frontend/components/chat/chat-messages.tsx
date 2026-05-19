'use client'

import { useState, useEffect, useRef } from 'react'
import { ToolStep } from '@/lib/types'
import { Lang, translations } from '@/lib/translations'

interface ToolStepItemProps {
  step: ToolStep
}

function ToolStepItem({ step }: ToolStepItemProps) {
  return (
    <div className={`flex justify-start animate-fade-in-up ${step.done ? 'opacity-60' : ''}`}>
      <div className="max-w-sm px-4 py-2.5 bg-card border border-rule border-l-4 border-l-pot rounded-xl flex items-center gap-3">
        {step.done ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-leaf flex-shrink-0">
            <polyline points="20,6 9,17 4,12" />
          </svg>
        ) : (
          <div className="w-3 h-3 border-2 border-rule border-t-pot rounded-full animate-spin flex-shrink-0" />
        )}
        <span className="text-sm text-ink">{step.label}</span>
      </div>
    </div>
  )
}

interface VoiceNoteProps {
  content: string
  showTimestamp?: boolean
  timestamp?: Date
  lang: Lang
}

const WAVEFORM_HEIGHTS = [8, 16, 24, 18, 28, 12, 22, 30, 14, 20, 10, 26, 16, 8]

function VoiceNote({ content, showTimestamp, timestamp, lang }: VoiceNoteProps) {
  const t = translations[lang]
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [showTranscript, setShowTranscript] = useState(false)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const duration = 4

  useEffect(() => {
    if (isPlaying) {
      const startTime = Date.now() - (progress * duration * 1000)
      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000
        const newProgress = Math.min(elapsed / duration, 1)
        setProgress(newProgress)
        setCurrentTime(Math.min(Math.floor(elapsed), duration))
        
        if (newProgress >= 1) {
          setIsPlaying(false)
          setProgress(0)
          setCurrentTime(0)
          if (intervalRef.current) clearInterval(intervalRef.current)
        }
      }, 100)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isPlaying, progress])

  const togglePlay = () => {
    if (progress >= 1) {
      setProgress(0)
      setCurrentTime(0)
    }
    setIsPlaying(!isPlaying)
  }

  const formatTime = (seconds: number) => {
    return `0:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="max-w-xs bg-agent-bg border border-rule border-l-4 border-l-leaf rounded-2xl rounded-bl-sm px-3.5 py-2.5">
        <div className="flex items-center gap-3">
          {/* Play button */}
          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-full bg-leaf flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity"
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="white" className="w-3.5 h-3.5 ml-0.5">
                <polygon points="5,3 19,12 5,21" />
              </svg>
            )}
          </button>

          {/* Waveform */}
          <div className="relative flex items-center gap-0.5 flex-1 h-8">
            {WAVEFORM_HEIGHTS.map((height, i) => (
              <div
                key={i}
                className="w-[3px] rounded-sm bg-leaf transition-transform"
                style={{
                  height: `${height}px`,
                  opacity: isPlaying ? 1 : 0.5,
                  animation: isPlaying 
                    ? `waveform 0.8s ease-in-out infinite` 
                    : 'none',
                  animationDelay: isPlaying ? `${i * 7}ms` : '0ms',
                }}
              />
            ))}
            <div 
              className="absolute inset-y-0 left-0 bg-leaf/20 transition-all duration-100"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          {/* Duration */}
          <span className="font-mono text-xs text-ink-muted flex-shrink-0">
            {isPlaying ? formatTime(currentTime) : formatTime(duration)}
          </span>
        </div>

        {/* Transcript expansion */}
        <div 
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ maxHeight: showTranscript ? '200px' : '0px' }}
        >
          <div className="pt-3 mt-3 border-t border-rule">
            <p className="text-sm text-ink leading-relaxed">{content}</p>
          </div>
        </div>
      </div>

      {/* Label and transcript toggle */}
      <div className="flex items-center gap-2 ml-1">
        <span className="text-xs text-ink-muted">{t.voice_tap}</span>
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="text-xs text-leaf hover:underline"
        >
          {showTranscript ? t.ocultar_transcripcion : t.ver_transcripcion}
        </button>
      </div>

      {showTimestamp && timestamp && (
        <p className="text-xs text-ink-muted ml-1">
          {timestamp.toLocaleTimeString(lang === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  )
}

interface ChatMessagesProps {
  messages: Array<{
    id: string
    role: 'user' | 'agent'
    content: string
    imagePreview?: string
    toolUsed?: string | null
    fromCache?: boolean
    hasImage?: boolean
    timestamp: Date
    toolSteps?: ToolStep[]
    isVoiceNote?: boolean
  }>
  isTyping: boolean
  showTimestamps: boolean
  userName: string
  activeToolSteps: ToolStep[]
  lang: Lang
}

function getGreeting(lang: Lang): string {
  const t = translations[lang]
  const hour = new Date().getHours()
  if (hour >= 0 && hour < 6) return t.greeting_night
  if (hour >= 6 && hour < 12) return t.greeting_morning
  if (hour >= 12 && hour < 18) return t.greeting_afternoon
  return t.greeting_night
}

function formatTime(date: Date, lang: Lang): string {
  return date.toLocaleTimeString(lang === 'es' ? 'es-ES' : 'en-US', { hour: '2-digit', minute: '2-digit' })
}

export function ChatMessages({ messages, isTyping, showTimestamps, userName, activeToolSteps, lang }: ChatMessagesProps) {
  const t = translations[lang]
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping, activeToolSteps])

  if (messages.length === 0 && !isTyping && activeToolSteps.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
        <div className="mb-4 opacity-50">
          <img src="/logo.png" alt="FinBot" className="w-12 h-12 object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.4)]" />
        </div>
        <p className="font-serif italic text-ink-muted text-lg">
          {getGreeting(lang)}, {userName}. {t.empty_sub}
        </p>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
      {messages.map(message => (
        <div key={message.id} className="space-y-2">
          {/* Tool steps for this message */}
          {message.toolSteps && message.toolSteps.length > 0 && (
            <div className="space-y-2">
              {message.toolSteps.map(step => (
                <ToolStepItem key={step.id} step={step} />
              ))}
            </div>
          )}

          {/* Message bubble */}
          <div
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
          >
            {message.role === 'agent' && message.isVoiceNote ? (
              <VoiceNote 
                content={message.content} 
                showTimestamp={showTimestamps}
                timestamp={message.timestamp}
                lang={lang}
              />
            ) : (
              <div
                className={`max-w-md ${
                  message.role === 'user'
                    ? 'bg-card border border-rule rounded-2xl rounded-br-sm'
                    : 'bg-agent-bg border-l-4 border-leaf rounded-2xl rounded-bl-sm'
                } px-4 py-3`}
              >
                {/* Image preview for user messages */}
                {message.role === 'user' && message.imagePreview && (
                  <div className="mb-2">
                    <img
                      src={message.imagePreview}
                      alt={lang === 'es' ? 'Imagen adjunta' : 'Attached image'}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  </div>
                )}
                
                <p className="text-ink text-sm leading-relaxed">{message.content}</p>
                
                {/* Badges for agent messages */}
                {message.role === 'agent' && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.toolUsed && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-badge-tool-bg text-badge-tool-text border border-badge-tool-border">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                        </svg>
                        {message.toolUsed}
                      </span>
                    )}
                    {message.fromCache && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-badge-cache-bg text-badge-cache-text border border-badge-cache-border">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                          <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
                        </svg>
                        Cache
                      </span>
                    )}
                    {message.hasImage && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-badge-image-bg text-badge-image-text border border-badge-image-border">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21,15 16,10 5,21" />
                        </svg>
                        {lang === 'es' ? 'Imagen' : 'Image'}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Timestamp */}
                {showTimestamps && (
                  <p className="text-xs text-ink-muted mt-2">
                    {formatTime(message.timestamp, lang)}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Active tool steps (while processing) */}
      {activeToolSteps.length > 0 && (
        <div className="space-y-2">
          {activeToolSteps.map(step => (
            <ToolStepItem key={step.id} step={step} />
          ))}
        </div>
      )}

      {/* Typing indicator */}
      {isTyping && activeToolSteps.length === 0 && (
        <div className="flex justify-start animate-fade-in-up">
          <div className="bg-agent-bg border-l-4 border-leaf rounded-2xl rounded-bl-sm px-4 py-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-ink-muted animate-bounce-dot" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-ink-muted animate-bounce-dot" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-ink-muted animate-bounce-dot" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}
