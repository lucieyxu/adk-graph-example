import type { OrientationName } from '@src/styles/constants.ts'
import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * @returns The current orientation of the window. 'landscape' when the window is wider than it is tall, 'portrait' otherwise.
 */
export const useWindowOrientation = () => {
    const previousOrientation = useRef<OrientationName>('landscape')
    const [orientation, _setOrientation] = useState<OrientationName>('landscape')

    const setOrientation = useCallback((orientation: OrientationName) => {
        if (orientation === previousOrientation.current) return
        previousOrientation.current = orientation
        _setOrientation(orientation)
    }, [])

    useEffect(() => {
        const resizeHandler = () => {
            const windowAspectRatio = window.innerWidth / window.innerHeight
            const isLandscape = windowAspectRatio > 1
            setOrientation(isLandscape ? 'landscape' : 'portrait')
        }
        resizeHandler()
        window.addEventListener('resize', resizeHandler)
        return () => window.removeEventListener('resize', resizeHandler)
    }, [setOrientation])

    return orientation
}
