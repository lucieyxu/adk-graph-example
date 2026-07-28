'use client'

import * as analytics from '@shared/ts/lib/analytics.ts'
import { MdPrimaryTab, MdTabs } from '@shared/ts/lib/material.ts'
import { Button } from '@src/components/Button/index.ts'
import { ScreenTransition } from '@src/components/ScreenTransition/ScreenTransition.tsx'
import { useTranslation } from '@src/i18n/useTranslation.ts'
import { useSessionManagerStore } from '@src/stores/sessionManagerStore.ts'
import { useSettingsStore } from '@src/stores/settingsStore.ts'
import { AnimatePresence } from 'motion/react'
import { useEffect, useState } from 'react'
import styles from './session.module.scss'
import { Clicks } from './stages/Clicks/index.tsx'
import { Visualize } from './stages/Visualize/index.tsx'

type StageName = 'visualize' | 'clicks'

export const Session = () => {
    const { sessionId } = useSettingsStore()
    const t = useTranslation()
    const { reset, setScreen } = useSessionManagerStore()
    const [activeStage, setActiveStage] = useState<StageName>('visualize')

    // biome-ignore lint/correctness/useExhaustiveDependencies: only call once on page load
    useEffect(() => {
        analytics.emit('app_session_takeaway_scan', { id: sessionId })
    }, [])

    return (
        <ScreenTransition
            options={{
                onAnimationComplete: (variant) => {
                    if (variant === 'exit') {
                        reset()
                    }
                },
            }}>
            <div className={styles.session}>
                <MdTabs
                    className={styles.tabs}
                    onChange={(e) => {
                        const tabsOrdered: Array<StageName> = ['visualize', 'clicks']
                        const tabIndex = (e.target as unknown as { activeTabIndex: number })
                            .activeTabIndex
                        const newTab = tabsOrdered[tabIndex] ?? 'visualize'
                        setActiveStage(newTab)
                    }}>
                    <MdPrimaryTab>Visualize</MdPrimaryTab>
                    <MdPrimaryTab>Clicks</MdPrimaryTab>
                </MdTabs>
                <AnimatePresence mode='wait' initial={false}>
                    {activeStage === 'visualize' && <Visualize key='stage-visualize' />}

                    {activeStage === 'clicks' && <Clicks key='stage-click' />}
                </AnimatePresence>
                <div className={styles.bottomRow}>
                    <Button
                        color='blue'
                        onClick={() => {
                            setScreen('Home')
                        }}
                        icon={'arrow_forward'}>
                        {t.session.end}
                    </Button>
                </div>
            </div>
        </ScreenTransition>
    )
}
