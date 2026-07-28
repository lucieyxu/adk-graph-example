/** biome-ignore-all lint/style/useNamingConvention: map of screens contains capitalized keys */
'use client'

import { SessionManagerProvider } from '@src/providers/SessionManagerProvider/index.tsx'
import { useSessionManagerStore } from '@src/stores/sessionManagerStore.ts'
import { AnimatePresence } from 'motion/react'
import { Home } from './Home/index.tsx'
import { Session } from './Session/index.tsx'
import styles from './screens.module.scss'

export const screens = {
    Home,
    Session,
} as const

export type Screen = keyof typeof screens
export const screenKeys = Object.keys(screens) as Screen[]

export const Screens = () => {
    const { screen } = useSessionManagerStore()

    return (
        <div className={styles.container}>
            <SessionManagerProvider>
                <AnimatePresence mode='wait' initial={false}>
                    {screen === 'Home' && <Home key='screen-home' />}
                    {screen === 'Session' && <Session key='screen-session' />}
                </AnimatePresence>
            </SessionManagerProvider>
        </div>
    )
}
