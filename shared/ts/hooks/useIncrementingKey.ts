import { useEffect, useRef, useState } from 'react'

/**
 * A hook that appends an incrementing number to a key when it changes.
 * This is useful for motion enter/exit animations that are directional and need to be unique.
 *
 * @param key - The key to increment.
 * @returns The incremented key. If key is undefined or null, returns undefined.
 */
export const useIncrementingKey = (key: string | undefined | null) => {
    const [increment, setIncrement] = useState(0)
    const prevKey = useRef(key)

    useEffect(() => {
        if (prevKey.current !== key) {
            setIncrement((old) => old + 1)
            prevKey.current = key
        }
    }, [key])
    return key ? `${key}${increment}` : undefined
}
