'use client'
import { useState, useRef, useEffect } from 'react'
import { Mic, Square } from 'lucide-react'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  existingText?: string
}

export function VoiceInput({ onTranscript, existingText = '' }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    const hasSpeechRecognition = !!(win.SpeechRecognition || win.webkitSpeechRecognition)
    setIsSupported(hasSpeechRecognition)
  }, [])

  const startRecording = () => {
    if (typeof window === 'undefined') return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any
    const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError('Voice input not supported on this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    let finalTranscript = existingText ? existingText + ' ' : ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interimTranscript = ''
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' '
        } else {
          interimTranscript += transcript
        }
      }
      
      onTranscript(finalTranscript + interimTranscript)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access.')
      }
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsRecording(true)
    setError(null)
  }

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsRecording(false)
  }

  if (!isSupported) return null

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={isRecording ? stopRecording : startRecording}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
          isRecording
            ? 'bg-red-50 text-red-600 animate-pulse'
            : 'bg-[#EEF2FF] text-[#4F46E5] hover:bg-[#E0E7FF]'
        }`}
      >
        {isRecording ? (
          <>
            <Square size={12} />
            Stop recording
          </>
        ) : (
          <>
            <Mic size={12} />
            Speak your story
          </>
        )}
      </button>
      {isRecording && (
        <p className="text-xs text-red-500">
          🔴 Listening... tap Stop when done
        </p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}