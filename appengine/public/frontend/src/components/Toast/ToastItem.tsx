import * as RadixToast from '@radix-ui/react-toast'
import { MdIcon } from '@shared/ts/components/MdIcon/index.ts'
import { MdElevation, MdIconButton } from '@shared/ts/lib/material.ts'
import cn from 'classnames'
import { motion, useIsPresent } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './Toast.module.scss'
import {
    TOAST_DISMISSABILITY,
    TOAST_POSITIONS,
    TOAST_TYPES,
    type ToastData,
    type ToastDismissability,
    type ToastPosition,
} from './toastAtom.ts'

const swipeDismissabilityOptions: ToastDismissability[] = [
    TOAST_DISMISSABILITY.swipe,
    TOAST_DISMISSABILITY.all,
]

const buttonDismissabilityOptions: ToastDismissability[] = [
    TOAST_DISMISSABILITY.button,
    TOAST_DISMISSABILITY.all,
]

const baseProps = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { type: 'spring', duration: 0.5 },
} as const

const toastMotionProps = {
    [TOAST_POSITIONS.top]: {
        ...baseProps,
        initial: { ...baseProps.initial, y: '-100%' },
        animate: { ...baseProps.animate, y: '0%' },
        exit: { ...baseProps.exit, y: '-100%' },
    },
    [TOAST_POSITIONS.topLeft]: {
        ...baseProps,
        initial: { ...baseProps.initial, x: '-100%' },
        animate: { ...baseProps.animate, x: '0%' },
        exit: { ...baseProps.exit, x: '-100%' },
    },
    [TOAST_POSITIONS.topRight]: {
        ...baseProps,
        initial: { ...baseProps.initial, x: '100%' },
        animate: { ...baseProps.animate, x: '0%' },
        exit: { ...baseProps.exit, x: '100%' },
    },
    [TOAST_POSITIONS.bottom]: {
        ...baseProps,
        initial: { ...baseProps.initial, y: '100%' },
        animate: { ...baseProps.animate, y: '0%' },
        exit: { ...baseProps.exit, y: '100%' },
    },
    [TOAST_POSITIONS.bottomLeft]: {
        ...baseProps,
        initial: { ...baseProps.initial, x: '-100%' },
        animate: { ...baseProps.animate, x: '0%' },
        exit: { ...baseProps.exit, x: '-100%' },
    },
    [TOAST_POSITIONS.bottomRight]: {
        ...baseProps,
        initial: { ...baseProps.initial, x: '100%' },
        animate: { ...baseProps.animate, x: '0%' },
        exit: { ...baseProps.exit, x: '100%' },
    },
    [TOAST_POSITIONS.right]: {
        ...baseProps,
        initial: { ...baseProps.initial, x: '100%' },
        animate: { ...baseProps.animate, x: '0%' },
        exit: { ...baseProps.exit, x: '100%' },
    },
    [TOAST_POSITIONS.left]: {
        ...baseProps,
        initial: { ...baseProps.initial, x: '-100%' },
        animate: { ...baseProps.animate, x: '0%' },
        exit: { ...baseProps.exit, x: '-100%' },
    },
} as const

const dragDistanceXThreshold = 0.5 // % of toast width
const dragDistanceYThreshold = 0.75 // % of toast height

interface ToastItemProps extends ToastData {
    removeToast: (id: string) => void
    setSwipingId: (id: string | null) => void
    swipingId: string | null
    position: ToastPosition
}

const swipeDirections = ['left', 'right', 'top', 'bottom'] as const
type SwipeDirection = (typeof swipeDirections)[number]

export const ToastItem = ({
    removeToast,
    setSwipingId,
    swipingId,
    position,
    ...props
}: ToastItemProps) => {
    const isPresent = useIsPresent()

    const ref = useRef<HTMLDivElement>(null)
    const [dragDirection, setDragDirection] = useState<SwipeDirection | undefined>()
    const [enableSwipe, showDismissButton] = useMemo(
        () => [
            swipeDismissabilityOptions.includes(props.dismissability),
            buttonDismissabilityOptions.includes(props.dismissability),
        ],
        [props.dismissability],
    )
    const isSwiping = swipingId === props.id

    const dismissed = useRef(false)

    const handleDismiss = useCallback(() => {
        dismissed.current = true
        props.onDismiss?.(props.id)
        removeToast(props.id)
    }, [props.onDismiss, props.id, removeToast])

    useEffect(() => {
        if (isPresent) {
            return () => {
                if (!dismissed.current) props.onRemove?.(props.id)
            }
        }
    }, [props.onRemove, props.id, isPresent])

    return (
        <RadixToast.Root
            key={props.id}
            id={props.id}
            onOpenChange={(open) => (open ? undefined : handleDismiss())}
            asChild
            forceMount
            duration={props.duration}
            onSwipeStart={(event) => event.preventDefault()}
            onSwipeMove={(event) => event.preventDefault()}
            onSwipeEnd={(event) => event.preventDefault()}>
            <motion.div
                ref={ref}
                key={props.id}
                layout='position'
                drag={enableSwipe}
                dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                onDragStart={() => setSwipingId(props.id)}
                dragDirectionLock
                onDrag={(_, info) => {
                    const isHorizontal = Math.abs(info.offset.x) > Math.abs(info.offset.y)
                    const dragDirection = isHorizontal
                        ? info.offset.x > 0
                            ? 'right'
                            : 'left'
                        : info.offset.y > 0
                          ? 'bottom'
                          : 'top'
                    setDragDirection(dragDirection)
                }}
                onDragEnd={(_, info) => {
                    const toastWidth = ref.current?.clientWidth ?? 0
                    const toastHeight = ref.current?.clientHeight ?? 0

                    if (
                        Math.abs(info.offset.x) > dragDistanceXThreshold * toastWidth ||
                        Math.abs(info.offset.y) > dragDistanceYThreshold * toastHeight
                    ) {
                        handleDismiss()
                    }
                    requestAnimationFrame(() => setSwipingId(null))
                }}
                className={cn(isSwiping && styles.swiping)}>
                <motion.div
                    {...(isSwiping
                        ? toastMotionProps[dragDirection ?? 'right']
                        : toastMotionProps[position])}
                    className={cn(styles.toast, styles[props.type ?? TOAST_TYPES.info])}>
                    <MdElevation />
                    <div className={styles.content}>
                        {props.title && (
                            <RadixToast.Title className={styles.title}>
                                {props.title}
                            </RadixToast.Title>
                        )}
                        {props.description && (
                            <RadixToast.Description className={styles.description}>
                                {props.description}
                            </RadixToast.Description>
                        )}
                    </div>
                    {props.actions && (
                        <div className={styles.actions}>
                            {props.actions.map((action) => (
                                <button type='button' key={action.label} onClick={action.onClick}>
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    )}
                    {showDismissButton && (
                        <RadixToast.Close asChild>
                            <MdIconButton className={styles.close} aria-label='Close'>
                                <MdIcon icon='close' />
                            </MdIconButton>
                        </RadixToast.Close>
                    )}
                </motion.div>
            </motion.div>
        </RadixToast.Root>
    )
}
