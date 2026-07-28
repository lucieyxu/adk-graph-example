import type { Ref } from 'react'

/**
 * Merges multiple refs into a single ref function.
 *
 * @param refs - An array of refs to merge.
 *
 * @returns A single ref function that sets the value of all the refs.
 *
 * @example
 * const Component = forwardRef<HTMLDivElement>((_, forwardedRef) => {
 *   const localRef = useRef<HTMLDivElement>(null)
 *   const refCallback = useCallback(console.log, [])
 *   return <div ref={mergeRefs(forwardedRef, refCallback, localRef)} />
 * })
 */
export const mergeRefs =
    <T>(...refs: Ref<T>[]) =>
    (node: T | null) =>
        refs.forEach((ref) => {
            if (typeof ref === 'undefined' || ref === null) return
            if (typeof ref === 'function') ref(node)
            else if (typeof ref === 'object') ref.current = node
        })
