import { FixedViewportProvider } from '@src/providers/FixedViewportProvider/index.ts'
import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { SpeechToText, useSpeechToText } from './index.ts'
import storyStyles from './SpeechToTextStories.module.scss'

const meta: Meta<typeof SpeechToText> = {
    title: 'Frontend/Components/SpeechToText',
    component: SpeechToText,
    parameters: {
        layout: 'fullscreen',
    },
    decorators: [
        (Story) => (
            <FixedViewportProvider mode='landscape'>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                    }}>
                    <Story />
                </div>
            </FixedViewportProvider>
        ),
    ],
}

export default meta
type Story = StoryObj<typeof SpeechToText>

/**
 * Default button component
 */
export const ButtonComponent: Story = {
    render: () => {
        const [text, setText] = useState('')

        return (
            <div className={storyStyles.storyContainer}>
                <SpeechToText onResult={setText} />
                <div className={storyStyles.outputBox}>
                    {text || (
                        <span className={storyStyles.placeholder}>
                            Transcribed text will appear here…
                        </span>
                    )}
                </div>
            </div>
        )
    },
}

/**
 * Using the hook with custom UI
 */
export const CustomUIWithHook: Story = {
    render: () => {
        const [text, setText] = useState('')
        const { isListening, isSupported, toggle } = useSpeechToText({
            onResult: setText,
        })

        return (
            <div className={storyStyles.storyContainer}>
                <button
                    type='button'
                    onClick={toggle}
                    disabled={!isSupported}
                    style={{
                        padding: '16px 32px',
                        fontSize: '18px',
                        borderRadius: '8px',
                        border: 'none',
                        background: isListening ? '#c62828' : '#1976d2',
                        color: 'white',
                        cursor: isSupported ? 'pointer' : 'not-allowed',
                    }}>
                    {isListening ? '⏹ Stop Recording' : '🎤 Start Recording'}
                </button>
                <div className={storyStyles.outputBox}>
                    {text || (
                        <span className={storyStyles.placeholder}>
                            Speak after clicking the button…
                        </span>
                    )}
                </div>
            </div>
        )
    },
}
