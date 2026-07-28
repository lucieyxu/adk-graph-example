import {
    type RafMode,
    rafModes,
    useFrame,
    useFrameConductorIdAtom,
} from '@shared/ts/hooks/useFrame.ts'
import type { Meta, StoryObj } from '@storybook/react'
import cn from 'classnames'
import { useAtomValue } from 'jotai'
import { useEffect, useId, useRef, useState } from 'react'
import { useEventListener } from 'usehooks-ts'
import styles from './stories.module.scss'

interface ExampleProps {
    mode: RafMode
    currentConductor?: string | null
    showClickMessage?: boolean
    frameRate?: number
}

const Example = ({ mode, currentConductor, showClickMessage, frameRate }: ExampleProps) => {
    const id = useId()
    const isConductor = currentConductor === id

    const ref = useRef<HTMLParagraphElement>(null)

    const invalidate = useFrame(
        (time) => {
            if (ref.current) ref.current.textContent = `Time: ${time}`
        },
        { mode, id, frameRate },
    )

    useEventListener('click', invalidate)

    return (
        <div data-chromatic='ignore' className={styles.exampleContainer}>
            <div className={styles.exampleHeader}>
                <span className={styles.exampleLabel}>
                    ID:{' '}
                    <span
                        className={cn(
                            styles.chip,
                            isConductor ? styles.chipHighlight : styles.chipNeutral,
                        )}>
                        {id}
                    </span>
                </span>
                <span className={styles.exampleLabel}>
                    Mode:{' '}
                    <span
                        className={cn(
                            styles.chip,
                            styles.chipSmall,
                            mode === rafModes.always && styles.statusSuccess,
                            mode === rafModes.demand && styles.statusWarning,
                            mode === rafModes.never && styles.statusError,
                        )}>
                        {mode}
                    </span>
                </span>
            </div>
            <div className={styles.exampleTime}>
                <span ref={ref}>Time: 0</span>
            </div>
            {showClickMessage && (
                <div className={styles.exampleClickMessage}>
                    Click anywhere to trigger `invalidate()` in demand mode
                </div>
            )}
        </div>
    )
}

const MultiExample = () => {
    const currentConductor = useAtomValue(useFrameConductorIdAtom)
    const [modes, setModes] = useState<{ mode: RafMode; key: number }[]>([
        { mode: rafModes.always, key: 0 },
    ])

    useEffect(() => {
        const update = () =>
            setModes((m) => {
                const newMode = Object.values(rafModes)[Math.floor(Math.random() * 3)] ?? 'never'
                const newKey = Math.random()
                const newModes = [...m, { mode: newMode, key: newKey }]
                if (newModes.length > 4) return newModes.slice(1)
                return newModes
            })
        const interval = window.setInterval(update, 2000)
        return () => window.clearInterval(interval)
    }, [])

    return (
        <div data-chromatic='ignore' className={styles.demoContainer}>
            <div className={styles.infoPanel}>
                <div className={styles.infoPanelLabel}>Frame Conductor Status</div>
                <div className={styles.infoPanelValue}>
                    Current ID:{' '}
                    <span className={cn(styles.chip, styles.infoPanelChip)}>
                        {currentConductor}
                    </span>
                </div>
            </div>

            <div className={styles.section}>
                <div className={styles.sectionLabel}>Dynamic Hook Instances</div>
                <div className={styles.description}>
                    New instances added every 2 seconds with random modes (max 4 shown)
                </div>
                <div className={styles.helpText}>
                    Click anywhere to trigger `invalidate()` for instances using demand mode
                </div>
            </div>

            <div className={styles.examplesList}>
                {modes.map(({ mode, key }) => (
                    <Example key={key} mode={mode} currentConductor={currentConductor} />
                ))}
            </div>
        </div>
    )
}

const meta: Meta<typeof Example> = {
    title: 'Hooks/useFrame',
    component: Example,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
        actions: { disable: true },
        options: { showPanel: false },
        docs: {
            codePanel: false,
            description: {
                component:
                    'A hook that provides an efficent and unified interface for `window.requestAnimationFrame` within react.',
            },
        },
    },
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
    args: { mode: rafModes.demand, frameRate: undefined },
    argTypes: {
        mode: {
            control: 'select',
            options: Object.values(rafModes),
            description:
                'Execution mode: "always" runs on every frame, "demand" runs only when invalidated',
        },
        frameRate: {
            control: 'number',
            description:
                'Target frame rate in fps. If not specified, runs at display refresh rate. If specified, will run at the specified frame rate, but will not run if the frame rate is not met.',
        },
    },
    parameters: {
        docs: {
            description: {
                story: 'Basic usage of useFrame hook. Click on the component to see how demand mode works.',
            },
        },
    },
    render: (args) => <Example {...(args as ExampleProps)} showClickMessage />,
}

export const MultipleInstances: Story = {
    name: 'Multiple Instances',
    render: () => <MultiExample />,
    parameters: {
        docs: {
            description: {
                story: 'Demonstrates multiple useFrame instances with different modes being dynamically created and destroyed. Shows the conductor system in action.',
            },
        },
    },
}
