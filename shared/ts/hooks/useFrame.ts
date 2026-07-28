import { atom, useAtom, useAtomValue } from 'jotai'
import { useCallback, useEffect, useId } from 'react'

type UseFrameCallback = (time: number) => void

const useFrameEntriesAtom = atom<
    Map<
        string,
        {
            callback: UseFrameCallback
            mode: RafMode
            invalidated: boolean
            frameRate?: number
            lastExecutionTime: number
        }
    >
>(new Map())

export const rafModes = {
    /**
     * Runs the callback when the frame is invalidated.
     */
    demand: 'demand',

    /**
     * Runs the callback on every frame.
     */
    always: 'always',

    /**
     * Does not run the callback.
     */
    never: 'never',
} as const

export type RafMode = keyof typeof rafModes

export const useFrameConductorIdAtom = atom<string | null>(null)

interface UseFrameOptions {
    /**
     * The mode for the useFrame hook. "always" runs on every frame, "demand" runs only when invalidated.
     * @default 'demand'
     */
    mode?: RafMode
    /**
     * The id for the useFrame hook.
     */
    id?: string
    /**
     * Whether to log debug information to the console.
     */
    debug?: boolean

    /**
     * Target frame rate in fps. If not specified, runs at display refresh rate.
     * @default undefined (no frame rate limiting)
     */
    frameRate?: number
}

const defaultOptions: Required<Pick<UseFrameOptions, 'mode'>> = {
    mode: rafModes.demand,
}

/**
 * A hook that provides an efficent and unified interface for `window.requestAnimationFrame` within react.
 * Only one `window.requestAnimationFrame` loop is created globally, and is used for all callbacks.
 * Uses Jotai to manage the global state data across all instances of the hook.
 *
 * @param callback - The function to be called on each frame. The timestamp from `window.requestAnimationFrame` will be passed as the first parameter to this callback.
 * @param options - The options for the useFrame hook.
 * @param options.mode - The mode for the useFrame hook. "always" runs on every frame, "demand" runs only when invalidated, "never" does not run at all.
 * @param options.id - The id for the useFrame hook.
 * @param options.debug - Whether to log debug information to the console.
 *
 * @returns A function to invalidate the frame. This is used to trigger the frame callback in demand mode. When in "always" mode, the invalidate function has no effect.
 */
export const useFrame = (
    callback: UseFrameCallback,
    { mode = defaultOptions.mode, id: _id, debug, frameRate }: UseFrameOptions = defaultOptions,
) => {
    // generate a local id if one is not provided
    const localId = useId()
    const id = _id ?? localId

    // get the current conductor id
    const [conductorId, setConductorId] = useAtom(useFrameConductorIdAtom)
    const isCurrentConductor = conductorId === id

    // get the global list of useFrame entries
    const entries = useAtomValue(useFrameEntriesAtom)

    // handle updating the conductor id when no conductor id is set
    useEffect(() => {
        if (!conductorId) setConductorId(id)
    }, [conductorId, id, setConductorId])

    // handle clearing the conductor id when the current conductor is unmounted
    useEffect(() => {
        if (isCurrentConductor) return () => setConductorId(null)
    }, [isCurrentConductor, setConductorId])

    /**
     * Invalidates the frame. This is used to trigger the frame callback in demand mode. When in "always" mode, the invalidate function has no effect.
     */
    const invalidate = useCallback(() => {
        const entry = entries.get(id)
        if (entry) entry.invalidated = true
    }, [entries, id])

    useEffect(() => {
        if (mode !== rafModes.never)
            entries.set(id, {
                callback,
                mode,
                invalidated: mode === rafModes.always,
                frameRate,
                lastExecutionTime: 0,
            })
        else if (entries.has(id)) entries.delete(id)
        return () => {
            entries.delete(id)
        }
    }, [callback, entries, id, mode, frameRate])

    useEffect(() => {
        // this useEffect is only run by the conductor and runs regardless of the `mode`.
        if (!isCurrentConductor) return

        let animationFrameId: number

        // queue the next frame
        const queue = () => {
            animationFrameId = window.requestAnimationFrame(frame)
        }

        // the frame callback
        const frame = (time: number) => {
            let numCallbacks = 0
            entries.forEach((entry) => {
                const frameRateSatisfied =
                    entry.frameRate === undefined ||
                    1000 / entry.frameRate < time - entry.lastExecutionTime

                // Check frame rate timing if frameRate is specified
                if (!(entry.invalidated && frameRateSatisfied)) return

                entry.callback(time)
                entry.lastExecutionTime = time
                numCallbacks++
                if (entry.mode === rafModes.demand) entry.invalidated = false
            })

            if (debug)
                console.log(`conductor ${conductorId} running frame with ${numCallbacks} callbacks`)

            queue()
        }

        // start the raf loop
        queue()

        // cancel the raf loop when the component unmounts, it will be picked back up by the next conductor
        return () => window.cancelAnimationFrame(animationFrameId)
    }, [conductorId, debug, entries, isCurrentConductor])

    return invalidate
}
