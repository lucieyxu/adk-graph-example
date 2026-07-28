import * as Portal from '@radix-ui/react-portal'
import * as RadixToast from '@radix-ui/react-toast'
import { viewportAtom } from '@src/providers/FixedViewportProvider/viewportAtom.ts'
import cn from 'classnames'
import { useAtom, useAtomValue } from 'jotai'
import { AnimatePresence } from 'motion/react'
import { useCallback, useMemo, useState } from 'react'
import styles from './Toast.module.scss'
import { ToastItem } from './ToastItem.tsx'
import { TOAST_POSITIONS, type ToastPosition, toastAtom } from './toastAtom.ts'

interface ToastViewportsProps {
    position?: ToastPosition
}

export const ToastProvider = ({ position = TOAST_POSITIONS.bottom }: ToastViewportsProps) => {
    const [swipingId, setSwipingId] = useState<string | null>(null)
    const { container } = useAtomValue(viewportAtom)
    const [toastsRecord, setToast] = useAtom(toastAtom)

    const toasts = useMemo(() => Object.values(toastsRecord), [toastsRecord])

    const removeToast = useCallback(
        (id: string) =>
            setToast((prev) => {
                const newRecord = { ...prev }
                delete newRecord[id]
                return newRecord
            }),
        [setToast],
    )

    return (
        <RadixToast.Provider
            duration={Infinity} // this is overridden in the ToastItem component
        >
            <AnimatePresence>
                {toasts.map((toast) => (
                    <ToastItem
                        key={toast.id}
                        removeToast={removeToast}
                        setSwipingId={setSwipingId}
                        swipingId={swipingId}
                        position={position}
                        {...toast}
                    />
                ))}
            </AnimatePresence>

            <Portal.Root container={container}>
                <RadixToast.Viewport className={cn(styles.viewport, styles[position])} />
            </Portal.Root>
        </RadixToast.Provider>
    )
}
