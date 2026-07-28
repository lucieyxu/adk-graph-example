import { mergeToClone } from '@shared/ts/lib/mergeToClone.ts'
import { useCallback, useEffect, useState } from 'react'

/**
 * `useResizeObserverInstance` is a hook that creates a `ResizeObserver` instance.
 * @param callback - The callback function to be called when the dimensions of an observed element changes.
 * @returns The `ResizeObserver` instance.
 */
export const useResizeObserverInstance = (callback: ResizeObserverCallback) => {
    const [observer, setObserver] = useState<ResizeObserver>()
    useEffect(() => {
        const observer = new ResizeObserver(callback)
        setObserver(observer)
        return () => observer.disconnect()
    }, [callback])
    return observer
}

/**
 * `useResizeObserver` is a hook that observes the size of an element.
 * @param callback - The callback function to be called when the dimensions of an observed element changes.
 * @param defaultOptions - The default options to be used for the `ResizeObserver`.
 * @returns A ref callback generator function that should be executed and passed to the `ref` prop of the element to be observed.
 */
const useResizeObserver = (
    callback: ResizeObserverCallback,
    defaultOptions?: ResizeObserverOptions,
) => {
    const observer = useResizeObserverInstance(callback)

    /**
     * A ref callback generator function that should be executed and passed to the `ref` prop of the element to be observed.
     * @param options - The options to be used for the `ResizeObserver`. These options will be merged with (and will override conflicting options in) the default options.
     * @returns A ref callback function that should be passed to the `ref` prop of the element to be observed.
     *
     * @example
     * ```tsx
     * <div ref={refCallback({ ...optionalElementSpecificOptions })} />;
     * ```
     */
    const observerRefCallback = useCallback(
        (options: ResizeObserverOptions = {}) =>
            (element: HTMLElement | null) => {
                if (element)
                    observer?.observe(
                        element,
                        defaultOptions ? mergeToClone(defaultOptions, options) : options,
                    )
            },
        [observer, defaultOptions],
    )

    return observerRefCallback
}

export default useResizeObserver
