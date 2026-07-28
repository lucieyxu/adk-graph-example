import { useMutationObserverInstance } from '@shared/ts/hooks/useMutationObserver.ts'
import { useResizeObserverInstance } from '@shared/ts/hooks/useResizeObserver.ts'
import { getSizeOfChildren } from '@shared/ts/lib/dom.ts'
import { useCallback, useLayoutEffect, useRef } from 'react'

/**
 * The default update timeout for the `useScrollState` hook.
 */
const defaultUpdateTimeout = 100

/**
 * The attribute names applied to the refed element by the `useScrollState` hook.
 */
export const scrollStateAttributes = {
    hasOverflow: 'data-has-overflow',
    scrollState: 'data-scroll-state',
} as const

/**
 * The possible scroll states.
 */
export const scrollStates = {
    start: 'start',
    end: 'end',
    scrolling: 'scrolling',
} as const

export type ScrollState = (typeof scrollStates)[keyof typeof scrollStates]

/**
 * The possible scroll directions.
 */
export const scrollDirections = {
    vertical: 'vertical',
    horizontal: 'horizontal',
} as const

type ScrollDirection = (typeof scrollDirections)[keyof typeof scrollDirections]

export interface UseScrollStateProps {
    updateTimeout?: number
    direction?: ScrollDirection
    onStateChange?: (hasOverflow: boolean, scrollState: ScrollState) => void
    stateMargin?: number
}

/**
 * @description
 * This hook is used to track the scroll state of an element by applying `data-`
 * attributes to the reffed element to allow for styling in css based on scroll state.
 *
 * The attributes are:
 * - data-has-overflow: boolean
 * - data-scroll-state: 'start' | 'end' | 'scrolling'
 *
 * The attributes are applied to the refed element and are used to style the element in css.
 *
 * The hook is used to track the scroll state of an element.
 */
const useScrollState = <T extends HTMLElement>({
    updateTimeout = defaultUpdateTimeout,
    direction = scrollDirections.vertical,
    onStateChange,
    stateMargin = 0,
}: UseScrollStateProps = {}) => {
    const ref = useRef<T | null>(null)
    const hasOverflowRef = useRef(false)
    const scrollStateRef = useRef<ScrollState>(scrollStates.start)
    const childrenHeightRef = useRef(-1)
    const childrenWidthRef = useRef(-1)
    const handleScrollTimeout = useRef(-1)

    const notifyStateChange = useCallback(
        () => onStateChange?.(hasOverflowRef.current, scrollStateRef.current),
        [onStateChange],
    )

    const updateScrollAttribute = useCallback(() => {
        if (handleScrollTimeout.current === -1) {
            handleScrollTimeout.current = window.setTimeout(() => {
                if (ref.current) {
                    if (direction === scrollDirections.vertical) {
                        const { height: _height } = ref.current.getBoundingClientRect()
                        const height = Math.round(_height)
                        const scrollDist = childrenHeightRef.current - height
                        const scrollTop = Math.round(ref.current.scrollTop)
                        if (scrollTop <= stateMargin) scrollStateRef.current = scrollStates.start
                        else if (scrollTop >= scrollDist - stateMargin)
                            scrollStateRef.current = scrollStates.end
                        else scrollStateRef.current = scrollStates.scrolling
                    } else {
                        const { width: _width } = ref.current.getBoundingClientRect()
                        const width = Math.round(_width)
                        const scrollDist = childrenWidthRef.current - width
                        const scrollLeft = Math.round(ref.current.scrollLeft)

                        if (scrollLeft <= stateMargin) scrollStateRef.current = scrollStates.start
                        else if (scrollLeft >= scrollDist - stateMargin)
                            scrollStateRef.current = scrollStates.end
                        else scrollStateRef.current = scrollStates.scrolling
                    }
                    ref.current.setAttribute(
                        scrollStateAttributes.scrollState,
                        scrollStateRef.current,
                    )
                    notifyStateChange()
                }
                handleScrollTimeout.current = -1
            }, updateTimeout)
        }
    }, [direction, notifyStateChange, stateMargin, updateTimeout])

    const handleResize = useCallback(() => {
        if (ref.current) {
            if (direction === 'vertical') {
                const { height } = ref.current.getBoundingClientRect()
                childrenHeightRef.current = getSizeOfChildren(ref.current, 'offsetHeight')
                const scrollDist = childrenHeightRef.current - Math.round(height)
                const currentHasOverfow = scrollDist > 0
                ref.current.toggleAttribute(scrollStateAttributes.hasOverflow, currentHasOverfow)

                if (currentHasOverfow !== hasOverflowRef.current) {
                    hasOverflowRef.current = currentHasOverfow
                    notifyStateChange()
                }

                if (currentHasOverfow) {
                    ref.current.addEventListener('scroll', updateScrollAttribute)
                } else {
                    ref.current.removeEventListener('scroll', updateScrollAttribute)
                }
            } else {
                const { width } = ref.current.getBoundingClientRect()
                childrenWidthRef.current = getSizeOfChildren(ref.current, 'offsetWidth')
                const scrollDist = childrenWidthRef.current - Math.round(width)
                const currentHasOverfow = scrollDist > 0
                ref.current.toggleAttribute(scrollStateAttributes.hasOverflow, currentHasOverfow)

                if (currentHasOverfow !== hasOverflowRef.current) {
                    hasOverflowRef.current = currentHasOverfow
                    notifyStateChange()
                }

                if (currentHasOverfow) {
                    ref.current.addEventListener('scroll', updateScrollAttribute)
                } else {
                    ref.current.removeEventListener('scroll', updateScrollAttribute)
                }
            }
        }
    }, [direction, notifyStateChange, updateScrollAttribute])

    const resizeObserver = useResizeObserverInstance(handleResize)
    const mutationObserver = useMutationObserverInstance(handleResize)

    const windowRef = useRef<Window | null>(null)
    useLayoutEffect(() => {
        windowRef.current = window
    }, [])

    const setRef = useCallback(
        (element: T | null) => {
            // remove scroll event listener from previous ref, if there is one
            if (ref.current) {
                ref.current.removeEventListener('scroll', updateScrollAttribute)
                resizeObserver?.disconnect()
                mutationObserver?.disconnect()
            }

            ref.current = element

            if (ref.current) {
                resizeObserver?.observe(ref.current)
                mutationObserver?.observe(ref.current, { childList: true, subtree: true })
                handleResize()
                updateScrollAttribute()
            }
        },
        [handleResize, mutationObserver, resizeObserver, updateScrollAttribute],
    )

    return setRef
}

export default useScrollState
