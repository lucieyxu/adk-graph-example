import { mergeToClone } from '@shared/ts/lib/mergeToClone.ts'
import { useCallback, useEffect, useState } from 'react'

/**
 * Creates a MutationObserver instance that can be used to observe DOM mutations.
 *
 * @param callback - Function to be called when mutations occur. Receives an array of MutationRecord objects
 * and the MutationObserver instance.
 * @returns The MutationObserver instance
 */
export const useMutationObserverInstance = (callback: MutationCallback) => {
    const [observer, setObserver] = useState<MutationObserver>()
    useEffect(() => {
        const observer = new MutationObserver(callback)
        setObserver(observer)
        return () => observer.disconnect()
    }, [callback])
    return observer
}

/**
 * Hook that provides a ref callback to observe DOM mutations on an element.
 *
 * @param callback - Function to be called when mutations occur. Receives an array of MutationRecord objects
 * and the MutationObserver instance.
 * @param defaultOptions - Optional default configuration for the MutationObserver
 * @returns A ref callback generator function that should be executed and passed to the `ref` prop of the element to be observed.
 */
const useMutationObserver = (callback: MutationCallback, defaultOptions?: MutationObserverInit) => {
    const observer = useMutationObserverInstance(callback)

    /**
     * A ref callback generator function that should be executed and passed to the `ref` prop of the element to be observed.
     * @param options - The options to be used for the `MutationObserver`. These options will be merged with (and will override conflicting options in) the default options.
     * @returns A ref callback function that should be passed to the `ref` prop of the element to be observed.
     *
     * @example
     * ```tsx
     * <div ref={refCallback({ ...optionalElementSpecificOptions })} />;
     * ```
     */
    const observerRefCallback = useCallback(
        (options: MutationObserverInit = {}) =>
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

export default useMutationObserver
