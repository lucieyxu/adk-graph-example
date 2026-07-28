'use client'
import { Button } from '@src/components/Button/index.ts'
import { SpeechToText } from '@src/components/SpeechToText/index.ts'
import { Webcam, type WebcamHandle } from '@src/components/Webcam/index.ts'
import { useSounds } from '@src/hooks/useSounds.ts'
import { useRef, useState } from 'react'
import styles from './Sounds.module.scss'

export const Sounds = () => {
    const { playSound, playSequence, stopAll } = useSounds()
    const [transcript, setTranscript] = useState('')
    const webcamRef = useRef<WebcamHandle>(null)
    const [capturedImage, setCapturedImage] = useState<string | null>(null)

    /**
     * To add new sounds, edit the AudioProvider's SAMPLE_PRESETS or SOUND_PRESETS:
     *
     * For audio file samples, add to SAMPLE_PRESETS:
     *   export const SAMPLE_PRESETS = {
     *     clip1: { url: '/sounds/clip1.mp3' },
     *     myNewSample: { url: '/sounds/myNewSample.mp3' },
     *   } as const
     *
     * For synth sounds, add to SOUND_PRESETS:
     *   export const SOUND_PRESETS = {
     *     beep: { frequency: 800, duration: 0.1, type: 'sine' as const },
     *     mySynth: { frequency: 440, duration: 0.2, type: 'triangle' as const },
     *   } as const
     *
     * To play a sound, use:
     *   playSound('beep')
     *   playSound('clip1')
     *
     * To play a sequence (mixing samples, synths, and pauses):
     *   playSequence([
     *     { type: 'sound', sound: 'clip1' },
     *     { type: 'pause', duration: 0.5 },
     *     { type: 'sound', sound: 'beep', frequency: 1000 },
     *     { type: 'pause', duration: 0.5 },
     *     { type: 'sound', sound: 'mySynth' },
     *   ])
     *
     * Use { type: 'pause', duration: X } to insert a pause of X seconds between sounds.
     */

    const handlePlayBeep = () => playSound('beep')
    const handlePlaySuccess = () => playSound('success')
    const handlePlayError = () => playSound('error')
    const handlePlayClip1 = () => playSound('clip1')
    const handlePlayClip2 = () => playSound('clip2')

    const handlePlaySampleSequence = () => {
        // Sequence of one-shot samples and synth notes
        playSequence([
            { type: 'sound', sound: 'clip1' },
            { type: 'pause', duration: 0.5 },
            { type: 'sound', sound: 'beep', frequency: 1000 },
            { type: 'pause', duration: 0.5 },
            { type: 'sound', sound: 'clip2' },
            { type: 'pause', duration: 0.5 },
            { type: 'sound', sound: 'success' },
        ])
    }

    return (
        <div className={styles.container}>
            <div className={styles.column}>
                <div className={styles.soundDemo}>
                    <h2 className='type header-2'>Sound Demo</h2>
                    <div className={styles.soundButtons}>
                        <Button onClick={handlePlayBeep}>Play Beep</Button>
                        <Button onClick={handlePlaySuccess}>Play Success</Button>
                        <Button onClick={handlePlayError}>Play Error</Button>
                        <Button onClick={handlePlayClip1}>Play Clip 1</Button>
                        <Button onClick={handlePlayClip2}>Play Clip 2</Button>
                        <Button onClick={handlePlaySampleSequence}>Play Sequence</Button>
                        <Button onClick={stopAll}>Stop All</Button>
                    </div>
                    <p className={styles.soundNote}>
                        Sounds respect the global mute setting in Settings Menu. Toggle "Enable
                        Sounds" to test mute functionality.
                    </p>
                </div>
            </div>
            <div className={styles.column}>
                <div className={styles.speechDemo}>
                    <h2 className='type header-2'>Speech to Text Demo</h2>
                    <SpeechToText onResult={setTranscript} />
                    <div className={styles.transcriptBox}>
                        {transcript || (
                            <span className={styles.placeholder}>
                                Click the mic button and start speaking...
                            </span>
                        )}
                    </div>
                    <p className={styles.soundNote}>
                        Speech recognition uses Chrome's default microphone
                        (chrome://settings/content/microphone). Language is set from the Settings
                        Menu.
                    </p>
                </div>
            </div>
            <div className={styles.column}>
                <div className={styles.webcamDemo}>
                    <h2 className='type header-2'>Webcam Demo</h2>
                    <Webcam ref={webcamRef} className={styles.webcam} />
                    <Button
                        onClick={() => {
                            const image = webcamRef.current?.capture()
                            if (image) {
                                setCapturedImage(image)
                            }
                        }}>
                        Capture Image
                    </Button>
                    {capturedImage && (
                        <div className={styles.capturedImage}>
                            <img src={capturedImage} alt='Captured' />
                        </div>
                    )}
                    <p className={styles.soundNote}>
                        Camera and mirror settings can be configured in the Settings Menu.
                    </p>
                </div>
            </div>
        </div>
    )
}
