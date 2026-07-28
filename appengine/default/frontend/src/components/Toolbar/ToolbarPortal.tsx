import { useSetAtom } from 'jotai'
import { useCallback, useEffect, useId } from 'react'
import { type ToolbarEntry, toolbarAtom } from './toolbarAtom.ts'

/**
 * A portal to render components in the toolbar.
 *
 * @example
 * ```tsx
 * {showToolbarEntry && <ToolbarPortal> <Button>Go</Button> </ToolbarPortal>}
 * ```
 */
export const ToolbarPortal = (entry: Omit<ToolbarEntry, 'id'>) => {
    const id = useId()
    const setToolbarContent = useSetAtom(toolbarAtom)

    const removeToolbarEntry = useCallback(
        (id: string) =>
            setToolbarContent((prev) => {
                const { [id]: _, ...rest } = prev
                return rest
            }),
        [setToolbarContent],
    )

    const addToolbarEntry = useCallback(
        () => setToolbarContent((prev) => ({ ...prev, [id]: { id, ...entry } })),
        [setToolbarContent, id, entry],
    )

    useEffect(() => {
        addToolbarEntry()
        return () => removeToolbarEntry(id)
    }, [addToolbarEntry, removeToolbarEntry, id])

    return null
}
