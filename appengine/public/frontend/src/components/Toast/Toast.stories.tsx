import { MdSelect } from '@shared/ts/components/MdSelect/index.ts'
import { MdSlider } from '@shared/ts/components/MdSlider/MdSlider.tsx'
import { Button } from '@src/components/Button/index.ts'
import { FixedViewportProvider } from '@src/providers/FixedViewportProvider/index.ts'
import type { Meta, StoryFn } from '@storybook/react'
import { MotionConfig } from 'motion/react'
import { useRef, useState } from 'react'
import { action } from 'storybook/actions'
import { Toast } from './Toast.tsx'
import { ToastProvider } from './ToastProvider.tsx'
import {
    TOAST_DISMISSABILITY,
    TOAST_POSITIONS,
    TOAST_TYPES,
    type ToastDismissability,
    type ToastType,
    useToast,
} from './toastAtom.ts'

const meta: Meta<typeof ToastProvider> = {
    title: 'Frontend/Components/Toast',
    component: ToastProvider,
    args: { position: TOAST_POSITIONS.bottom },
    argTypes: {
        position: { control: 'select', options: Object.values(TOAST_POSITIONS) },
    },
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <FixedViewportProvider mode='landscape'>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                        gap: '16rem',
                        maxWidth: 'calc(var(--viewport-width) - 200rem)',
                    }}>
                    <Story />
                </div>
            </FixedViewportProvider>
        ),
    ],
}
export default meta

const callbackProps = {
    onDismiss: action('onDismiss'),
    onRemove: action('onRemove'),
}

export const Simple: StoryFn<typeof ToastProvider> = (args) => {
    const [duration, setDuration] = useState(1000)
    const toast = useToast()
    const { position } = args
    const toastId = `toast-simple`

    return (
        <>
            <label htmlFor='duration'>
                duration (ms)
                <MdSlider
                    labeled
                    id='duration'
                    min={0}
                    max={10000}
                    step={100}
                    value={duration}
                    onChange={setDuration}
                />
            </label>
            <Button
                onClick={() =>
                    toast({
                        id: toastId,
                        title: 'Simple Toast with Title Only',
                        dismissability: 'all',
                        duration,
                        ...callbackProps,
                    })
                }>
                Show Toast
            </Button>
            <ToastProvider position={position} />
        </>
    )
}

export const ComponentMethod: StoryFn<typeof ToastProvider> = (args) => {
    const [toastShown, setToastShown] = useState(false)
    const label = `${toastShown ? 'Hide' : 'Show'} Toast`

    return (
        <>
            <Button onClick={() => setToastShown(!toastShown)}>{label}</Button>
            {toastShown && (
                <Toast
                    id='toast-component'
                    title='Component Method Toast'
                    onDismiss={(id) => {
                        setToastShown(false)
                        action('onDismiss')(id)
                    }}
                    onRemove={(id) => {
                        setToastShown(false)
                        action('onRemove')(id)
                    }}
                />
            )}
            <ToastProvider position={args.position} />
        </>
    )
}

export const Dismissability: StoryFn<typeof ToastProvider> = (args) => {
    const toast = useToast()
    const { position } = args

    const [dismissability, setDismissability] = useState<ToastDismissability>(
        TOAST_DISMISSABILITY.all,
    )

    return (
        <>
            <MdSelect
                label='Dismissability'
                value={dismissability}
                options={Object.values(TOAST_DISMISSABILITY)}
                onChange={setDismissability}
            />
            <Button
                onClick={() => {
                    const title = `Toast (dismissability: ${dismissability})`
                    return toast({ id: title, title, dismissability, ...callbackProps })
                }}>
                Show Toast
            </Button>
            <ToastProvider position={position} />
        </>
    )
}

export const Actions: StoryFn<typeof ToastProvider> = (args) => {
    const toast = useToast()
    const [type, setType] = useState<ToastType>(TOAST_TYPES.info)
    const removeSuccessToast = useRef<(() => void) | null>(null)
    const [dismissability, setDismissability] = useState<ToastDismissability>(
        TOAST_DISMISSABILITY.all,
    )
    const addToast = () => {
        const remove = toast({
            id: 'toast-with-actions',
            title: `Something went wrong`,
            type,
            dismissability,
            actions: [
                {
                    label: 'Retry',
                    onClick: () => {
                        remove()
                        window.setTimeout(() => {
                            removeSuccessToast.current = toast({
                                id: 'success-toast',
                                title: 'It worked this time!',
                                type: TOAST_TYPES.success,
                                ...callbackProps,
                            })
                        }, 1000)
                    },
                },
            ],
        })
    }

    return (
        <>
            <MdSelect
                label='Toast Type'
                value={type}
                onChange={setType}
                options={Object.values(TOAST_TYPES)}
            />
            <MdSelect
                label='Dismissability'
                value={dismissability}
                options={Object.values(TOAST_DISMISSABILITY)}
                onChange={setDismissability}
            />
            <Button onClick={addToast}>Add a Toast</Button>
            <ToastProvider position={args.position} />
        </>
    )
}

export const RichDescription: StoryFn<typeof ToastProvider> = (args) => {
    const toast = useToast()
    const { position } = args
    const toastId = `toast-description-${position}`

    return (
        <>
            <Button
                onClick={() =>
                    toast({
                        id: toastId,
                        title: 'Toast with Rich Description',
                        description: (
                            <p>
                                This is a description with <strong>bold</strong> and <em>italic</em>{' '}
                                text.
                            </p>
                        ),
                        ...callbackProps,
                    })
                }>
                Show Toast
            </Button>
            <ToastProvider position={position} />
        </>
    )
}

export const LowPerformance: StoryFn<typeof ToastProvider> = (args) => {
    const toast = useToast()
    const { position } = args
    const toastId = `toast-description-${position}`

    return (
        <>
            <MotionConfig reducedMotion='always' />
            <Button
                onClick={() =>
                    toast({
                        id: toastId,
                        title: 'Toast with Rich Description',
                        description: (
                            <p>
                                This is a description with <strong>bold</strong> and <em>italic</em>{' '}
                                text.
                            </p>
                        ),
                        ...callbackProps,
                    })
                }>
                Show Toast
            </Button>
            <ToastProvider position={position} />
        </>
    )
}

export const Position: StoryFn<typeof ToastProvider> = (args) => {
    const toast = useToast()
    const { position } = args
    const toastId = `toast-position-${position}`

    return (
        <>
            <Button
                onClick={() => toast({ id: toastId, title: 'I am at the top', ...callbackProps })}>
                Show Toast at {args.position}
            </Button>
            <ToastProvider position={args.position} />
        </>
    )
}

Position.args = {
    position: TOAST_POSITIONS.top,
}

// 4. Multiple Toasts
export const MultipleToasts: StoryFn<typeof ToastProvider> = (args) => {
    const currentToastId = useRef(0)
    const toast = useToast()

    const removeFunctions = useRef<[string, () => void][]>([])
    const [dismissability, setDismissability] = useState<ToastDismissability>(
        TOAST_DISMISSABILITY.all,
    )
    const [type, setType] = useState<ToastType | 'random'>(TOAST_TYPES.info)
    const addToast = () => {
        const toastNumber = currentToastId.current++
        const toastId = `toast-${toastNumber}`

        removeFunctions.current.push([
            toastId,
            toast({
                id: toastId,
                title: `${type} toast`,
                type:
                    type === 'random'
                        ? Object.values(TOAST_TYPES)[
                              Math.floor(Math.random() * Object.values(TOAST_TYPES).length)
                          ]
                        : type,
                dismissability,
                ...callbackProps,
                onDismiss: () => {
                    removeFunctions.current = removeFunctions.current.filter(
                        ([id]) => id !== toastId,
                    )
                    action('onDismiss')()
                },
            }),
        ])
    }

    return (
        <>
            <MdSelect
                label='Dismissability'
                value={dismissability}
                options={Object.values(TOAST_DISMISSABILITY)}
                onChange={setDismissability}
            />
            <MdSelect
                label='Toast Type'
                value={type}
                onChange={setType}
                options={[...Object.values(TOAST_TYPES), 'random']}
            />

            <Button onClick={() => addToast()}>Add a Toast</Button>
            <Button
                onClick={() => {
                    const [toastId, removeFunction] = removeFunctions.current.shift() ?? []
                    if (toastId && removeFunction) removeFunction()
                }}>
                remove the first toast
            </Button>
            <Button
                onClick={() => {
                    const removalIndex = Math.floor(Math.random() * removeFunctions.current.length)
                    const [[, removedItem] = []] = removeFunctions.current.splice(removalIndex, 1)
                    removedItem?.()
                }}>
                remove a random toast
            </Button>

            <ToastProvider position={args.position} />
        </>
    )
}
