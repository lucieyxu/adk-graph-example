import { useEffect } from 'react'
import { type ToastProps, useToast } from './toastAtom.ts'

/**
 * A component that, when rendered, will show a toast.
 *
 * @example
 * ```tsx
 * {showToast && <Toast id='toast-simple' title='Simple Toast' />}
 * ```
 */
export const Toast = (props: ToastProps) => {
    const toast = useToast()
    useEffect(() => toast(props), [toast, props])
    return null
}
