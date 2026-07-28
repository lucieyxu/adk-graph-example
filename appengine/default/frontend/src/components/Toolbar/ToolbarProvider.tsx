import * as Portal from '@radix-ui/react-portal'
import { MdIcon } from '@shared/ts/components/MdIcon/MdIcon.tsx'
import useScrollState, { type ScrollState, scrollStates } from '@shared/ts/hooks/useScrollState.ts'
import { MdElevation, MdIconButton } from '@shared/ts/lib/material.ts'
import { mergeRefs } from '@shared/ts/lib/mergeRefs.ts'
import { mergeToClone } from '@shared/ts/lib/mergeToClone.ts'
import { revealProps } from '@shared/ts/lib/motion.ts'
import { viewportAtom } from '@src/providers/FixedViewportProvider/viewportAtom.ts'
import cn from 'classnames'
import { useAtomValue } from 'jotai'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import styles from './Toolbar.module.scss'
import {
    TOOLBAR_POSITIONS,
    type ToolbarEntry,
    type ToolbarPosition,
    toolbarAtom,
} from './toolbarAtom.ts'

interface ToolbarProviderProps {
    position?: ToolbarPosition
}

const wrapperProps = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.9 },
    transition: { type: 'spring', duration: 0.5 },
} as const

const wrapperPositionMotionProps = {
    [TOOLBAR_POSITIONS.top]: {
        initial: { y: '-100%' },
        animate: { y: '0%' },
        exit: { y: '-100%' },
    },
    [TOOLBAR_POSITIONS.bottom]: {
        initial: { y: '100%' },
        animate: { y: '0%' },
        exit: { y: '100%' },
    },
    [TOOLBAR_POSITIONS.left]: {
        initial: { x: '-100%' },
        animate: { x: '0%' },
        exit: { x: '-100%' },
    },
    [TOOLBAR_POSITIONS.right]: {
        initial: { x: '100%' },
        animate: { x: '0%' },
        exit: { x: '100%' },
    },
} as const

const entryProps = {
    initial: { opacity: 0, scale: 0.9, width: 0, height: 0 },
    animate: { opacity: 1, scale: 1, width: 'auto', height: 'auto' },
    exit: { opacity: 0, scale: 0.9, width: 0, height: 0 },
    transition: { type: 'spring', duration: 0.5 },
} as const

const entryPositionMotionProps = {
    [TOOLBAR_POSITIONS.top]: {
        initial: { width: 0 },
        animate: { width: 'auto' },
        exit: { width: 0 },
    },
    [TOOLBAR_POSITIONS.bottom]: {
        initial: { width: 0 },
        animate: { width: 'auto' },
        exit: { width: 0 },
    },
    [TOOLBAR_POSITIONS.left]: {
        initial: { height: 0 },
        animate: { height: 'auto' },
        exit: { height: 0 },
    },
    [TOOLBAR_POSITIONS.right]: {
        initial: { height: 0 },
        animate: { height: 'auto' },
        exit: { height: 0 },
    },
} as const

const scrollButtonTransition = { duration: 0.2, type: 'spring', bounce: 0 } as const

export const ToolbarProvider = ({ position = TOOLBAR_POSITIONS.bottom }: ToolbarProviderProps) => {
    const { container } = useAtomValue(viewportAtom)
    const toolbarEntries = useAtomValue(toolbarAtom)
    const [entryMap, setEntryMap] = useState<{ [order: number]: ToolbarEntry[] }>({})

    useEffect(() => {
        const newEntries = Object.values(toolbarEntries)
        setEntryMap((prev) => {
            const newEntryMap = { ...prev }
            const prevFlat = Object.values(prev).flat()
            // find entries with ids that are not in the new entries and remove them
            prevFlat
                .filter((entry) => !newEntries.find((newEntry) => newEntry.id === entry.id))
                // remove the entries from the new entry map
                .forEach((entry) => {
                    const order = entry.order ?? Number.MAX_SAFE_INTEGER
                    const orderEntries = newEntryMap[order]
                    if (!orderEntries) return

                    const deleteIndex = orderEntries.findIndex((e) => e.id === entry.id)
                    if (deleteIndex !== undefined) orderEntries.splice(deleteIndex, 1)

                    if (orderEntries.length === 0) delete newEntryMap[order]
                })
            // find entries that are in the new entries but not in the old entries
            newEntries
                .filter((entry) => !prevFlat.find((prunedEntry) => prunedEntry.id === entry.id))
                .forEach((entry) => {
                    const order = entry.order ?? Number.MAX_SAFE_INTEGER
                    let orderEntries = newEntryMap[order]
                    if (!orderEntries) orderEntries = newEntryMap[order] = []

                    orderEntries.push(entry)
                })

            // add the entries in order
            // return the new array
            return newEntryMap
        })
    }, [toolbarEntries])

    const entries = useMemo(() => {
        return Object.entries(entryMap)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .flatMap(([_, entries]) => entries)
    }, [entryMap])

    const [{ hasOverflow, scrollState }, setScrollState] = useState<{
        hasOverflow: boolean
        scrollState: ScrollState
    }>({ hasOverflow: false, scrollState: scrollStates.end })

    const scrollingElementRef = useRef<HTMLDivElement>(null)
    const scrollStateRef = useScrollState({
        direction:
            position === TOOLBAR_POSITIONS.top || position === TOOLBAR_POSITIONS.bottom
                ? 'horizontal'
                : 'vertical',
        onStateChange: useCallback(
            (hasOverflow: boolean, scrollState: ScrollState) =>
                setScrollState({ hasOverflow, scrollState }),
            [],
        ),
        stateMargin: 10,
    })

    const arrowForward =
        position === TOOLBAR_POSITIONS.left || position === TOOLBAR_POSITIONS.right
            ? 'arrow_downward'
            : 'arrow_forward'
    const arrowBack =
        position === TOOLBAR_POSITIONS.left || position === TOOLBAR_POSITIONS.right
            ? 'arrow_upward'
            : 'arrow_back'

    const scrollPage = useCallback(
        (direction: 'forward' | 'back') => {
            const scrollDirection = direction === 'forward' ? 1 : -1
            const scrollAxis =
                position === TOOLBAR_POSITIONS.left || position === TOOLBAR_POSITIONS.right
                    ? 'vertical'
                    : 'horizontal'

            const toolbarSize =
                (scrollAxis === 'horizontal'
                    ? scrollingElementRef.current?.clientWidth
                    : scrollingElementRef.current?.clientHeight) ?? 0

            const scrollDistance = (scrollDirection * toolbarSize) / 2

            scrollingElementRef.current?.scrollBy(
                scrollAxis === 'horizontal'
                    ? { left: scrollDistance, behavior: 'smooth' }
                    : { top: scrollDistance, behavior: 'smooth' },
            )
        },
        [position],
    )

    const scrollForward = useCallback(() => scrollPage('forward'), [scrollPage])
    const scrollBack = useCallback(() => scrollPage('back'), [scrollPage])

    const mergedRef = useMemo(
        () => mergeRefs(scrollStateRef, scrollingElementRef),
        [scrollStateRef],
    )

    const scrollButtonMotionProps = mergeToClone(revealProps, {
        transition: scrollButtonTransition,
    })

    return (
        <Portal.Root container={container}>
            <AnimatePresence>
                {entries.length > 0 && (
                    <motion.div
                        {...mergeToClone(wrapperProps, wrapperPositionMotionProps[position])}
                        className={cn(styles.wrapper, styles[position])}>
                        <MdElevation />
                        {entries.length > 1 && hasOverflow && (
                            <AnimatePresence>
                                {scrollState !== scrollStates.start && (
                                    <motion.div
                                        key='start'
                                        {...mergeToClone(
                                            scrollButtonMotionProps,
                                            wrapperPositionMotionProps[
                                                position === TOOLBAR_POSITIONS.top ||
                                                position === TOOLBAR_POSITIONS.bottom
                                                    ? 'left'
                                                    : 'top'
                                            ],
                                        )}
                                        className={cn(styles.scrollButton, styles.start)}>
                                        <div className={styles.scrollButtonInner}>
                                            <MdIconButton onClick={scrollBack}>
                                                <MdIcon icon={arrowBack} />
                                            </MdIconButton>
                                        </div>
                                    </motion.div>
                                )}
                                {scrollState !== scrollStates.end && (
                                    <motion.div
                                        key='end'
                                        {...mergeToClone(
                                            scrollButtonMotionProps,
                                            wrapperPositionMotionProps[
                                                position === TOOLBAR_POSITIONS.top ||
                                                position === TOOLBAR_POSITIONS.bottom
                                                    ? 'right'
                                                    : 'bottom'
                                            ],
                                        )}
                                        className={cn(styles.scrollButton, styles.end)}>
                                        <div className={styles.scrollButtonInner}>
                                            <MdIconButton onClick={scrollForward}>
                                                <MdIcon icon={arrowForward} />
                                            </MdIconButton>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        )}

                        <div ref={mergedRef} className={styles.toolbar}>
                            <motion.div layout='size' className={styles.toolbarInner}>
                                <AnimatePresence>
                                    {entries.map((entry) => (
                                        <motion.div
                                            key={entry.id}
                                            layout='position'
                                            className={styles.entryWrapper}>
                                            <motion.div
                                                {...(entries.length > 1
                                                    ? mergeToClone(
                                                          entryProps,
                                                          entryPositionMotionProps[position],
                                                      )
                                                    : {})}
                                                key={`${entry.id}-inner`}>
                                                <div className={styles.entryInner}>
                                                    {entry.children}
                                                </div>
                                            </motion.div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Portal.Root>
    )
}
