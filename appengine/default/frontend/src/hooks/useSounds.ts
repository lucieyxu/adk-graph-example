'use client'

import { SOUND_PRESETS } from '@src/providers/AudioProvider/AudioProvider.tsx'
import { useAudioContext } from '@src/providers/AudioProvider/index.ts'
import { useCallback, useRef } from 'react'
import * as Tone from 'tone'

export type SoundType = 'beep' | 'success' | 'error' | 'notification' | 'clip1' | 'clip2'

export interface SequenceItem {
    type: 'sound' | 'pause'
    sound?: SoundType
    duration?: number
    frequency?: number
}

interface UseSoundsReturn {
    playSound: (sound: SoundType, frequency?: number) => Promise<void>
    playSequence: (sequence: SequenceItem[]) => Promise<void>
    stopAll: () => void
    isPlaying: boolean
}

const REVERB_DECAY = 1.5

export const useSounds = (): UseSoundsReturn => {
    const { isReady, isMuted, startAudioContext, preloadedSamples } = useAudioContext()
    const isPlayingRef = useRef(false)

    const ensureAudioContext = useCallback(async (): Promise<boolean> => {
        if (isReady && Tone.getTransport().state === 'started') return true

        const started = await startAudioContext()
        if (started && Tone.getTransport().state !== 'started') {
            Tone.getTransport().start(Tone.now())
        }
        return started
    }, [isReady, startAudioContext])

    const playSynthSound = useCallback(
        (preset: (typeof SOUND_PRESETS)[keyof typeof SOUND_PRESETS], frequency?: number) => {
            const reverb = new Tone.Reverb({
                decay: 1.5,
                preDelay: 0.01,
                wet: 0.25,
            }).toDestination()

            // Similar to analog synthesis, oscillator creates the sound wave
            const synth = new Tone.Oscillator({
                frequency: frequency ?? preset.frequency,
                // The waveform can be passed to change the timbre of the sound in the preset "type":
                type: preset.type,
            })
            // envelope controls the volume over time, currently a short burst:
            const envelope = new Tone.AmplitudeEnvelope({
                attack: 0.01,
                decay: 0.1,
                sustain: 0.3,
                release: 0.1,
            })

            synth.connect(envelope).connect(reverb)
            synth.start(Tone.now())
            envelope.triggerAttackRelease('8n')

            const totalDuration = 0.01 + 0.1 + 0.1 // attack + decay + release (sustain is a level, not a duration)
            synth.stop(`+${totalDuration}`)

            // Clean up transport after sound + reverb decay
            Tone.getTransport().scheduleOnce(
                () => {
                    synth.dispose()
                    envelope.dispose()
                    reverb.dispose()
                },
                `+${totalDuration + REVERB_DECAY}`,
            )
        },
        [],
    )

    const playSound = useCallback(
        async (sound: SoundType, frequency?: number): Promise<void> => {
            if (isMuted || !(await ensureAudioContext())) return

            const reverb = new Tone.Reverb({
                decay: REVERB_DECAY,
                preDelay: 0.01,
                wet: 0.25,
            }).toDestination()

            if (sound in SOUND_PRESETS) {
                playSynthSound(SOUND_PRESETS[sound as keyof typeof SOUND_PRESETS], frequency)
            } else if (preloadedSamples?.has(sound)) {
                preloadedSamples.player(sound).connect(reverb).start(Tone.now())
            }
        },
        [isMuted, ensureAudioContext, playSynthSound, preloadedSamples],
    )

    const playSequence = useCallback(
        async (sequence: SequenceItem[]): Promise<void> => {
            if (isMuted || !(await ensureAudioContext())) return

            // Use preloaded samples (they should be loaded by now)
            if (!preloadedSamples) {
                console.warn('Samples not preloaded yet')
                return
            }

            // 1. Initialize Tone.js and set up instruments
            const reverb = new Tone.Reverb({
                decay: REVERB_DECAY,
                preDelay: 0.01,
                wet: 0.25,
            }).toDestination()

            const synth = new Tone.Synth().connect(reverb)

            // Connect preloaded samples to our reverb
            preloadedSamples.connect(reverb)

            // 3. Create the event data with custom properties
            const sequenceData: Array<{
                time: string
                instrument: 'synth' | 'player'
                sound?: SoundType
                note?: string
                frequency?: number
            }> = []

            let quarterNoteCount = 0
            for (const item of sequence) {
                if (item.type === 'sound' && item.sound) {
                    if (item.sound in SOUND_PRESETS) {
                        // Synth sound
                        const preset = SOUND_PRESETS[item.sound as keyof typeof SOUND_PRESETS]
                        const frequency = item.frequency ?? preset.frequency
                        const note = Tone.Frequency(frequency).toNote()

                        sequenceData.push({
                            time: `0:${quarterNoteCount}`,
                            instrument: 'synth',
                            note: note,
                            sound: item.sound,
                        })
                    } else if (preloadedSamples?.has(item.sound)) {
                        // Sample sound
                        sequenceData.push({
                            time: `0:${quarterNoteCount}`,
                            instrument: 'player',
                            sound: item.sound,
                        })
                    }
                }
                quarterNoteCount++ // Increment for both sounds and pauses
            }

            // 4. Create the Tone.Part with a callback function
            const part = new Tone.Part((time, value) => {
                // Use conditional logic to trigger the correct instrument
                if (value.instrument === 'synth' && value.note) {
                    synth.triggerAttackRelease(value.note, '8n', time)
                } else if (
                    value.instrument === 'player' &&
                    value.sound &&
                    preloadedSamples.has(value.sound)
                ) {
                    if (preloadedSamples.loaded) {
                        // Tone.Players handles multiple triggers automatically
                        preloadedSamples.player(value.sound).start(time)
                    }
                }
            }, sequenceData)

            // 5. Start the playback
            const now = Tone.now()
            part.start(now)

            // Make sure transport is started
            if (Tone.getTransport().state !== 'started') {
                Tone.getTransport().start(now)
            }

            // Calculate total duration and cleanup
            const totalDuration = quarterNoteCount * 0.5 + REVERB_DECAY

            return new Promise<void>((resolve) => {
                Tone.getTransport().scheduleOnce(() => {
                    part.dispose()
                    synth.dispose()
                    reverb.dispose()
                    // Don't dispose preloaded samples - they're managed by AudioProvider
                    resolve()
                }, now + totalDuration)
            })
        },
        [isMuted, ensureAudioContext, preloadedSamples],
    )

    const stopAll = useCallback(() => {
        isPlayingRef.current = false
        Tone.getTransport().cancel()
    }, [])

    return {
        playSound,
        playSequence,
        stopAll,
        isPlaying: isPlayingRef.current,
    }
}
