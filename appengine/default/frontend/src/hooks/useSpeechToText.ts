/**
 * useSpeechToText Hook
 *
 * A hook for speech-to-text using the Web Speech API (Chrome).
 * Reads language and continuous settings from the settings store.
 *
 * @example
 * ```tsx
 * const { isListening, isSupported, start, stop, toggle } = useSpeechToText({
 *   onResult: (text) => setTranscript(text)
 * })
 *
 * return (
 *   <button onClick={toggle} disabled={!isSupported}>
 *     {isListening ? 'Stop' : 'Start'}
 *   </button>
 * )
 * ```
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API
 */

import { useSettingsStore } from '@src/stores/settingsStore.ts'
import { useCallback, useEffect, useRef, useState } from 'react'

// Web Speech API types (not fully typed in lib.dom.d.ts)
interface SpeechRecognition extends EventTarget {
    continuous: boolean
    interimResults: boolean
    lang: string
    start: () => void
    stop: () => void
    abort: () => void
    onresult: ((event: SpeechRecognitionEvent) => void) | null
    onend: (() => void) | null
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
}

interface SpeechRecognitionEvent {
    results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
    [index: number]: SpeechRecognitionResult
    length: number
}

interface SpeechRecognitionResult {
    [index: number]: SpeechRecognitionAlternative
    isFinal: boolean
    length: number
}

interface SpeechRecognitionAlternative {
    transcript: string
    confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
    error: string
    message: string
}

declare global {
    interface Window {
        // biome-ignore lint/style/useNamingConvention: Standard API
        SpeechRecognition?: {
            new (): SpeechRecognition
        }
        webkitSpeechRecognition?: {
            new (): SpeechRecognition
        }
    }
}

export interface UseSpeechToTextOptions {
    /** Callback fired with transcribed text (interim and final results) */
    onResult?: (text: string) => void
    /** Override language from store. If not provided, uses locale from settings. */
    language?: string
    /** Override continuous from store. If not provided, uses speechContinuous from settings. */
    continuous?: boolean
    /** Whether to return interim results while speaking. Defaults to true. */
    interimResults?: boolean
}

export interface UseSpeechToTextReturn {
    /** Whether speech recognition is currently active */
    isListening: boolean
    /** Whether the Web Speech API is supported in this browser */
    isSupported: boolean
    /** Start listening */
    start: () => void
    /** Stop listening */
    stop: () => void
    /** Toggle listening state */
    toggle: () => void
}

export const useSpeechToText = ({
    onResult,
    language: languageOverride,
    continuous: continuousOverride,
    interimResults = true,
}: UseSpeechToTextOptions = {}): UseSpeechToTextReturn => {
    const { locale, speechContinuous } = useSettingsStore()

    // Convert locale format (en_US) to BCP 47 format (en-US)
    const language = languageOverride ?? locale.replace('_', '-')
    const continuous = continuousOverride ?? speechContinuous

    const [isListening, setIsListening] = useState(false)
    const [isSupported, setIsSupported] = useState(true)
    const recognitionRef = useRef<SpeechRecognition | null>(null)
    const onResultRef = useRef(onResult)

    // Keep the callback ref up to date
    useEffect(() => {
        onResultRef.current = onResult
    }, [onResult])

    useEffect(() => {
        if (typeof window === 'undefined') return

        const SpeechRecognitionConstructor =
            window.SpeechRecognition || window.webkitSpeechRecognition

        if (!SpeechRecognitionConstructor) {
            setIsSupported(false)
            return
        }

        const recognition = new SpeechRecognitionConstructor()
        recognition.continuous = continuous
        recognition.interimResults = interimResults
        recognition.lang = language

        recognition.onresult = (event: SpeechRecognitionEvent) => {
            let interimTranscript = ''
            let finalTranscript = ''

            for (let i = 0; i < event.results.length; ++i) {
                const result = event.results[i]
                if (!result) continue

                const alternative = result[0]
                if (!alternative) continue

                if (result.isFinal) {
                    finalTranscript += alternative.transcript
                } else {
                    interimTranscript += alternative.transcript
                }
            }

            // Prefer final transcript if available, otherwise show interim
            const text = finalTranscript || interimTranscript
            if (onResultRef.current && text) {
                onResultRef.current(text)
            }
        }

        recognition.onend = () => {
            setIsListening(false)
        }

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            console.error('Speech recognition error', event.error)
            setIsListening(false)
        }

        recognitionRef.current = recognition

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.abort()
            }
        }
    }, [language, continuous, interimResults])

    const start = useCallback(() => {
        if (!recognitionRef.current || isListening) return
        try {
            recognitionRef.current.start()
            setIsListening(true)
        } catch (e) {
            console.error('Error starting speech recognition:', e)
        }
    }, [isListening])

    const stop = useCallback(() => {
        if (!recognitionRef.current || !isListening) return
        recognitionRef.current.stop()
    }, [isListening])

    const toggle = useCallback(() => {
        if (isListening) {
            stop()
        } else {
            start()
        }
    }, [isListening, start, stop])

    return {
        isListening,
        isSupported,
        start,
        stop,
        toggle,
    }
}
