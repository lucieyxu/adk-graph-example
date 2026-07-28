/**
 * SpeechToText Component
 *
 * A pre-styled button for speech-to-text. Uses the useSpeechToText hook internally.
 * For custom UI, use the useSpeechToText hook directly instead.
 *
 * @example
 * ```tsx
 * import { SpeechToText } from '@src/components/SpeechToText'
 *
 * const MyComponent = () => {
 *   const [transcript, setTranscript] = useState('')
 *
 *   return (
 *     <div>
 *       <SpeechToText onResult={setTranscript} />
 *       <p>{transcript}</p>
 *     </div>
 *   )
 * }
 * ```
 */

import { MdIcon } from '@shared/ts/components/MdIcon/index.ts'
import { type UseSpeechToTextOptions, useSpeechToText } from '@src/hooks/useSpeechToText.ts'
import cn from 'classnames'
import styles from './SpeechToText.module.scss'

export interface SpeechToTextProps extends UseSpeechToTextOptions {
    className?: string
}

export const SpeechToText = ({ className, ...hookOptions }: SpeechToTextProps) => {
    const { isListening, isSupported, toggle } = useSpeechToText(hookOptions)

    return (
        <button
            type='button'
            className={cn(styles.button, isListening && styles.recording, className)}
            onClick={toggle}
            disabled={!isSupported}
            aria-label={
                !isSupported
                    ? 'Speech recognition not supported'
                    : isListening
                      ? 'Stop recording'
                      : 'Start recording'
            }>
            <MdIcon icon='mic' filled className={cn(styles.icon, isListening && styles.hidden)} />
            <MdIcon
                icon='mic_off'
                filled
                className={cn(styles.icon, !isListening && styles.hidden)}
            />
        </button>
    )
}
