import type { PointerEvent, TouchEvent } from 'react'

/**
 * Spread this on a clickable element to apply a `clicked` attribute
 * that can be used to style the element when it is being tapped on a touch device.
 *
 * The css `:active` state has a delay and is not as responsive on all devices.
 *
 * @example
 * <button {...fixTouchActive}>Click me</button>
 */
export const fixTouchActive = <T extends HTMLElement = HTMLElement>() => ({
    onPointerDown: (ev: PointerEvent<T> | MouseEvent) => {
        const target = ev.target as T | undefined
        target?.setAttribute('clicked', 'true')
    },
    onTouchStart: (ev: TouchEvent<T>) => {
        const target = ev.target as T | undefined
        target?.setAttribute('clicked', 'true')
    },
    onPointerLeave: (ev: PointerEvent<T> | MouseEvent) => {
        const target = ev.target as T | undefined
        target?.removeAttribute('clicked')
    },
    onPointerUp: (ev: PointerEvent<T> | MouseEvent) => {
        const target = ev.target as T | undefined
        target?.removeAttribute('clicked')
    },
    onTouchEnd: (ev: TouchEvent<T>) => {
        const target = ev.target as T | undefined
        target?.removeAttribute('clicked')
    },
})
