import type { ValuesOf } from '@shared/types/util.ts'
import { atom, useSetAtom } from 'jotai'
import { type ReactNode, useCallback, useEffect, useRef } from 'react'

export const TOAST_TYPES = {
    success: 'success',
    error: 'error',
    info: 'info',
    warning: 'warning',
} as const

export type ToastType = (typeof TOAST_TYPES)[keyof typeof TOAST_TYPES]

export const TOAST_POSITIONS = {
    top: 'top',
    topLeft: 'top-left',
    topRight: 'top-right',
    bottom: 'bottom',
    bottomLeft: 'bottom-left',
    bottomRight: 'bottom-right',
    left: 'left',
    right: 'right',
} as const

export type ToastPosition = ValuesOf<typeof TOAST_POSITIONS>

export type ToastAction = {
    label: string
    onClick: () => void
    variant?: 'outlined' | 'filled'
}

export const TOAST_DISMISSABILITY = {
    all: 'all',
    button: 'button',
    swipe: 'swipe',
    none: 'none',
} as const

export type ToastDismissability = ValuesOf<typeof TOAST_DISMISSABILITY>

export interface ToastData {
    id: string
    title: string | ReactNode
    type: ToastType
    description?: string | ReactNode
    dismissability: ToastDismissability
    actions?: ToastAction[]
    duration?: number
    /**
     * Called when the toast's duration has elapsed, or when it has been dismissed by swiping or clicking the close button.
     * @param id - The id of the toast.
     */
    onDismiss?: (id: string) => void
    /**
     * Called when the some other component/process makes changes to the state in the toastAtom resulting in this toast being removed.
     * @param id - The id of the toast.
     */
    onRemove?: (id: string) => void
}

export const toastAtom = atom<Record<string, ToastData>>({})

export type ToastProps = Partial<ToastData> & Pick<ToastData, 'id' | 'title'>

/**
 * A hook for adding toasts.
 *
 * @param autoCleanup - Whether to automatically remove the toast when the calling component unmounts. Default is true.
 *
 * @example
 * ```tsx
 * const toast = useToast()
 * const cleanupRef = useRef<(() => void) | null>(null)
 *
 * const addToast = () => {
 *     cleanupRef.current = toast({ id: 'toast-simple', title: 'Simple Toast' })
 * }
 *
 * const removeToast = () => cleanupRef.current?.()
 * ```
 */
export const useToast = (autoCleanup = true) => {
    const locallyAddedToasts = useRef<ToastData[]>([])
    const setToast = useSetAtom(toastAtom)

    const removeToast = useCallback(
        (id: string) =>
            setToast((prev) => {
                const { [id]: _, ...rest } = prev
                locallyAddedToasts.current = locallyAddedToasts.current.filter(
                    (toast) => toast.id !== id,
                )
                return rest
            }),
        [setToast],
    )

    const toast = useCallback(
        (_toast: ToastProps) => {
            const toast: ToastData = {
                ..._toast,
                // Apply default values if not provided
                type: _toast.type ?? TOAST_TYPES.info,
                dismissability: _toast.dismissability ?? TOAST_DISMISSABILITY.all,
            }

            locallyAddedToasts.current.push(toast)
            setToast((prev) => ({ ...prev, [toast.id]: toast }))
            return () => removeToast(toast.id)
        },
        [removeToast, setToast],
    )

    useEffect(() => {
        if (autoCleanup) {
            return () => {
                locallyAddedToasts.current.forEach((toast) => {
                    removeToast(toast.id)
                })
            }
        }
    }, [autoCleanup, removeToast])

    return toast
}
