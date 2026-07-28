'use client'

import { MdPrimaryTab, MdTabs } from '@shared/ts/lib/material.ts'
import { Button } from '@src/components/Button/index.ts'
import { ScreenTransition } from '@src/components/ScreenTransition/ScreenTransition.tsx'
import { useTranslation } from '@src/i18n/useTranslation.ts'
import { Click } from '@src/screens/Session/stages/Click/index.tsx'
import { Shopping } from '@src/screens/Session/stages/Shopping/index.tsx'
import { Sounds } from '@src/screens/Session/stages/Sounds/index.tsx'
import { Takeaway } from '@src/screens/Session/stages/Takeaway/index.tsx'
import { Visualize } from '@src/screens/Session/stages/Visualize/index.tsx'
import { useSessionManagerStore } from '@src/stores/sessionManagerStore.ts'
import { useSessionStore } from '@src/stores/sessionStore.ts'
import { AnimatePresence } from 'motion/react'
import { useState } from 'react'

import styles from './session.module.scss'

type StageName = 'shopping' | 'visualize' | 'click' | 'sounds' | 'takeaway'

export const Session = () => {
    const t = useTranslation()
    const { reset, requestEndWithConfirmation } = useSessionManagerStore()
    const sessionStoreReset = useSessionStore().reset
    const [activeStage, setActiveStage] = useState<StageName>('shopping')

    return (
        <ScreenTransition
            options={{
                onAnimationComplete: (variant) => {
                    if (variant === 'exit') {
                        reset()
                        sessionStoreReset()
                    }
                },
            }}>
            <div className={styles.session}>
                <MdTabs
                    className={styles.tabs}
                    onChange={(e) => {
                        const tabsOrdered: Array<StageName> = [
                            'shopping',
                            'visualize',
                            'click',
                            'sounds',
                            'takeaway',
                        ]
                        const tabIndex = (e.target as unknown as { activeTabIndex: number })
                            .activeTabIndex
                        const newTab = tabsOrdered[tabIndex] ?? 'click'
                        setActiveStage(newTab)
                    }}>
                    <MdPrimaryTab>Shopping</MdPrimaryTab>
                    <MdPrimaryTab>Visualize</MdPrimaryTab>
                    <MdPrimaryTab>Clicks</MdPrimaryTab>
                    <MdPrimaryTab>Sound & Media</MdPrimaryTab>
                    <MdPrimaryTab>Takeaway</MdPrimaryTab>
                </MdTabs>
                <AnimatePresence mode='wait' initial={false}>
                    {activeStage === 'shopping' && <Shopping key='stage-shopping' />}

                    {activeStage === 'visualize' && <Visualize key='stage-visualize' />}

                    {activeStage === 'click' && <Click key='stage-click' />}

                    {activeStage === 'sounds' && <Sounds key='stage-sounds' />}

                    {activeStage === 'takeaway' && <Takeaway key='stage-takeaway' />}
                </AnimatePresence>
                <div className={styles.bottomRow}>
                    <Button
                        color='blue'
                        onClick={() => {
                            requestEndWithConfirmation()
                        }}
                        icon={'arrow_forward'}>
                        {t.session.end}
                    </Button>
                </div>
            </div>
        </ScreenTransition>
    )
}
