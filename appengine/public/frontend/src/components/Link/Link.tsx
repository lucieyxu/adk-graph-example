'use client'

import type { Screen } from '@src/screens/index.tsx'
import { useSessionManagerStore } from '@src/stores/sessionManagerStore.ts'
import { cloneElement, type ReactElement } from 'react'

export interface LinkProps<P extends object = object, T extends ReactElement<P> = ReactElement<P>> {
    to: Screen
    asChild?: boolean
    children: T
}

/**
 * A helper to go to the given screen.
 *
 * @param to - The screen to go to

 * @example
 * goTo('Home')
 */
export const goTo = (to: Screen) => useSessionManagerStore.getState().setScreen(to)

/**
 * A helper to create a link props object with the onClick handler to go to the given screen. Spread onto a component to make it a link.
 *
 * @param to - The screen to go to
 *
 * @example
 * <Button {...link('Home')}>Home</Button>
 */
export const link = (to: Screen) => ({ onClick: () => goTo(to) })

/**
 * A component to make a component a link.
 *
 * @param param0 - The props for the component
 *
 * @example
 * <Link to='home'>Home</Link>
 * // or
 * <Link asChild to='home'><Button>Home</Button></Link>
 */
export const Link = <P extends object, T extends ReactElement<P>>({
    to,
    asChild,
    children,
}: LinkProps<P, T>) => {
    const { setScreen } = useSessionManagerStore()
    const handleClick = () => setScreen(to)

    return asChild ? (
        cloneElement(children, { onClick: handleClick } as P)
    ) : (
        <button type='button' onClick={handleClick}>
            {children}
        </button>
    )
}
