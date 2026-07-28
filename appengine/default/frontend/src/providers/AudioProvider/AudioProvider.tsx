'use client'
import { colorsRaw } from '@shared/ts/colors/index.ts'
import { logStyled } from '@shared/ts/lib/utils.ts'
import { useSettingsStore } from '@src/stores/settingsStore.ts'
import {
    createContext,
    type PropsWithChildren,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react'
import * as Tone from 'tone'

export const SAMPLE_PRESETS = {
    clip1: { url: '/sounds/clip1.mp3' },
    clip2: { url: '/sounds/clip2.mp3' },
} as const

export const SOUND_PRESETS = {
    beep: { frequency: 800, duration: 0.1, type: 'sine' as const },
    success: { frequency: 600, duration: 0.2, type: 'sine' as const },
    error: { frequency: 300, duration: 0.3, type: 'triangle' as const },
    notification: { frequency: 1000, duration: 0.15, type: 'triangle' as const },
} as const

interface AudioContextValue {
    isReady: boolean
    isMuted: boolean
    startAudioContext: () => Promise<boolean>
    preloadedSamples: Tone.Players | null
}

const AudioContext = createContext<AudioContextValue | null>(null)

export const AudioProvider = ({ children }: PropsWithChildren) => {
    const { enableSounds } = useSettingsStore()
    const isReadyRef = useRef(false)
    const isLoadingRef = useRef(false)
    const hasAttemptedStartRef = useRef(false)
    const [preloadedSamples, setPreloadedSamples] = useState<Tone.Players | null>(null)

    // Load samples once on mount, even if sound is disabled
    useEffect(() => {
        const loadSamples = async () => {
            isLoadingRef.current = true
            const sampleUrls: Record<string, string> = {}
            Object.entries(SAMPLE_PRESETS).forEach(([key, preset]) => {
                sampleUrls[key] = preset.url
            })

            const players = new Tone.Players(sampleUrls).toDestination()
            await Tone.loaded()
            setPreloadedSamples(players)

            console.log(
                ...logStyled(['Audio', 'Loaded all samples'], {
                    backgroundColor: colorsRaw['pink-300'],
                }),
            )
        }

        if (!isLoadingRef.current) loadSamples()
    }, [])

    useEffect(() => {
        const startAudioOnUserInteraction = async () => {
            // Only try once
            if (hasAttemptedStartRef.current) return

            hasAttemptedStartRef.current = true

            try {
                console.log(
                    ...logStyled(['Audio', 'Interaction started audio context'], {
                        backgroundColor: colorsRaw['pink-400'],
                    }),
                )
                await Tone.start()
                isReadyRef.current = true
            } catch (error) {
                console.warn('Failed to start audio context on user interaction:', error)
            }
        }

        // Listen for first click/touch anywhere on the page
        const handleFirstInteraction = () => {
            startAudioOnUserInteraction()
            // Remove listeners after first interaction
            document.removeEventListener('click', handleFirstInteraction)
            document.removeEventListener('touchstart', handleFirstInteraction)
        }

        // Add listeners for first user interaction
        document.addEventListener('click', handleFirstInteraction)
        document.addEventListener('touchstart', handleFirstInteraction)

        // Cleanup on unmount
        return () => {
            document.removeEventListener('click', handleFirstInteraction)
            document.removeEventListener('touchstart', handleFirstInteraction)

            if (preloadedSamples) {
                preloadedSamples.dispose()
                setPreloadedSamples(null)
            }

            if (Tone.getContext().state === 'running') {
                Tone.getTransport().stop()
                Tone.getTransport().cancel()
            }
        }
    }, [preloadedSamples])

    useEffect(() => {
        // Update master volume based on settings
        Tone.getDestination().mute = !enableSounds
    }, [enableSounds])

    const startAudioContext = async () => {
        try {
            if (Tone.getContext().state !== 'running') {
                await Tone.start()
            }
            isReadyRef.current = true
            return true
        } catch (error) {
            console.warn('Failed to start audio context:', error)
            return false
        }
    }

    const contextValue: AudioContextValue = {
        isReady: isReadyRef.current && Tone.getContext().state === 'running',
        isMuted: !enableSounds,
        startAudioContext,
        preloadedSamples,
    }

    return <AudioContext.Provider value={contextValue}>{children}</AudioContext.Provider>
}

export const useAudioContext = () => {
    const context = useContext(AudioContext)
    if (!context) {
        throw new Error('useAudioContext must be used within an AudioProvider')
    }
    return context
}
