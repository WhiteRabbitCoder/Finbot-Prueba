'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { InputMode, OutputMode } from '@/lib/types'
import { transcribeAudio } from '@/lib/api'

interface ChatInputProps {
  inputMode: InputMode
  outputMode: OutputMode
  onInputModeChange: (mode: InputMode) => void
  onOutputModeChange: (mode: OutputMode) => void
  onSendMessage: (message: string, imageB64?: string) => void
  disabled?: boolean
  prefillValue?: string
  onPrefillUsed?: () => void
}

export function ChatInput({
  inputMode,
  outputMode,
  onInputModeChange,
  onOutputModeChange,
  onSendMessage,
  disabled = false,
  prefillValue = '',
  onPrefillUsed,
}: ChatInputProps) {
  const [text, setText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionError, setTranscriptionError] = useState('')
  const [transcription, setTranscription] = useState('')
  const [selectedImage, setSelectedImage] = useState<{ file: File; preview: string } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const cancelledRef = useRef(false)

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      const maxHeight = 120 // ~4 lines
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
    }
  }, [])

  useEffect(() => {
    adjustTextareaHeight()
  }, [text, adjustTextareaHeight])

  // Handle prefill value from FAQ
  useEffect(() => {
    if (prefillValue) {
      setText(prefillValue)
      onPrefillUsed?.()
      textareaRef.current?.focus()
    }
  }, [prefillValue, onPrefillUsed])

  const handleSend = () => {
    const messageText = text.trim()
    if (!messageText && !selectedImage) return

    let imageB64: string | undefined
    if (selectedImage) {
      imageB64 = selectedImage.preview
    }

    onSendMessage(messageText, imageB64)
    setText('')
    setSelectedImage(null)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setSelectedImage({
          file,
          preview: ev.target?.result as string,
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setSelectedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/ogg'
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []
      cancelledRef.current = false

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop())
        if (cancelledRef.current) return

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType })
        if (audioBlob.size === 0) {
          setTranscriptionError('No se capturó audio. Inténtalo de nuevo.')
          return
        }

        setIsTranscribing(true)
        setTranscriptionError('')
        try {
          const result = await transcribeAudio(audioBlob)
          setTranscription(result.text)
        } catch (err) {
          setTranscriptionError(err instanceof Error ? err.message : 'Error al transcribir')
        } finally {
          setIsTranscribing(false)
        }
      }

      mediaRecorder.start(250)
      setIsRecording(true)
    } catch (error) {
      console.error('Error al acceder al micrófono:', error)
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const cancelRecording = () => {
    cancelledRef.current = true
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop()
    setIsRecording(false)
    setTranscription('')
    setTranscriptionError('')
    audioChunksRef.current = []
  }

  const sendTranscription = () => {
    if (transcription) {
      onSendMessage(transcription)
      setTranscription('')
    }
  }

  const canSend = (inputMode === 'text' || inputMode === 'image') 
    ? (text.trim().length > 0 || selectedImage !== null) 
    : transcription.length > 0

  return (
    <div className="border-t border-rule bg-paper p-4">
      {/* Mode toggles */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted">Entrada:</span>
          <div className="flex gap-1">
            {(['text', 'voice', 'image'] as InputMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => onInputModeChange(mode)}
                className={`px-3 py-1 text-xs rounded-full transition-all ${
                  inputMode === mode
                    ? 'bg-ink text-paper'
                    : 'bg-transparent text-ink-muted border border-rule hover:border-ink-muted'
                }`}
              >
                {mode === 'text' && 'Texto'}
                {mode === 'voice' && 'Voz'}
                {mode === 'image' && 'Imagen'}
              </button>
            ))}
          </div>
        </div>

        <div className="w-px h-4 bg-rule hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-xs text-ink-muted">Salida:</span>
          <div className="flex gap-1">
            {(['text', 'audio'] as OutputMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => onOutputModeChange(mode)}
                className={`px-3 py-1 text-xs rounded-full transition-all ${
                  outputMode === mode
                    ? 'bg-leaf text-paper'
                    : 'bg-transparent text-ink-muted border border-rule hover:border-ink-muted'
                }`}
              >
                {mode === 'text' && 'Texto'}
                {mode === 'audio' && 'Audio'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Input area based on mode */}
      <div className="bg-input-bg rounded-2xl border border-rule shadow-sm">
        {inputMode === 'text' && (
          <div className="flex items-end gap-2 p-2">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje..."
              disabled={disabled}
              className="flex-1 resize-none bg-transparent text-ink placeholder:text-ink-muted text-sm px-2 py-2 focus:outline-none min-h-[40px]"
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={!canSend || disabled}
              className={`p-2 rounded-xl bg-ink text-paper transition-all active:scale-95 ${
                !canSend || disabled ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            </button>
          </div>
        )}

        {inputMode === 'voice' && (
          <div className="p-4 text-center">
            {!isRecording && !transcription && (
              <button
                onClick={startRecording}
                disabled={disabled}
                className="w-16 h-16 rounded-full bg-ink text-paper flex items-center justify-center mx-auto hover:opacity-90 transition-opacity"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                  <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
                  <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
                </svg>
              </button>
            )}

            {isRecording && (
              <div className="space-y-3">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full bg-ember animate-pulse-ring" />
                  <div className="relative w-16 h-16 rounded-full bg-ember text-paper flex items-center justify-center">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className="w-1 bg-paper rounded-full animate-bounce-dot"
                          style={{
                            height: `${8 + Math.random() * 16}px`,
                            animationDelay: `${i * 100}ms`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-ink-muted">Grabando...</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={cancelRecording}
                    className="text-sm text-ink-muted hover:text-ember"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={stopRecording}
                    className="text-sm text-leaf hover:underline"
                  >
                    Detener
                  </button>
                </div>
              </div>
            )}

            {isTranscribing && (
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="w-6 h-6 border-2 border-rule border-t-leaf rounded-full animate-spin" />
                <p className="text-sm text-ink-muted">Transcribiendo...</p>
              </div>
            )}

            {!isTranscribing && transcriptionError && (
              <div className="space-y-3">
                <p className="text-sm text-ember text-center">{transcriptionError}</p>
                <div className="flex justify-center">
                  <button
                    onClick={() => { setTranscriptionError(''); audioChunksRef.current = [] }}
                    className="text-sm text-ink-muted hover:text-ink"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            )}

            {!isTranscribing && !transcriptionError && transcription && (
              <div className="space-y-3">
                <p className="text-sm text-ink bg-card rounded-lg p-3">{transcription}</p>
                <div className="flex justify-center gap-4">
                  <button
                    onClick={() => setTranscription('')}
                    className="text-sm text-ink-muted hover:text-ember"
                  >
                    Descartar
                  </button>
                  <button
                    onClick={sendTranscription}
                    className="px-4 py-2 bg-ink text-paper rounded-xl text-sm hover:opacity-90"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {inputMode === 'image' && (
          <div className="p-4 space-y-3">
            {!selectedImage ? (
              <label
                className="block border-2 border-dashed border-pot rounded-xl p-6 text-center cursor-pointer hover:bg-card/50 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-8 h-8 mx-auto mb-2 text-pot">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21,15 16,10 5,21" />
                </svg>
                <p className="text-sm text-ink-muted">
                  Arrastra una imagen o haz clic para seleccionar
                </p>
              </label>
            ) : (
              <div className="flex items-center gap-3 bg-card rounded-xl p-3">
                <img
                  src={selectedImage.preview}
                  alt="Vista previa"
                  className="w-16 h-16 rounded-lg object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink truncate">{selectedImage.file.name}</p>
                  <button
                    onClick={removeImage}
                    className="text-xs text-ember hover:underline"
                  >
                    Eliminar imagen
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Mensaje sobre la imagen..."
                disabled={disabled}
                className="flex-1 resize-none bg-transparent text-ink placeholder:text-ink-muted text-sm px-2 py-2 focus:outline-none border border-rule rounded-xl min-h-[40px]"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={!canSend || disabled}
                className={`p-2 rounded-xl bg-ink text-paper transition-all active:scale-95 ${
                  !canSend || disabled ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                  <path d="M12 19V5M5 12l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
