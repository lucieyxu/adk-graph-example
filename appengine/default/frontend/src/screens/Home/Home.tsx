'use client'

import { useAuthStore } from '@shared/ts/hooks/useFirebaseAuth.ts'
import { MdCircularProgress } from '@shared/ts/lib/material.ts'
import { Button } from '@src/components/Button/index.ts'
import { Icon } from '@src/components/CustomIcon/CustomIcon.tsx'
import { ScreenTransition } from '@src/components/ScreenTransition/ScreenTransition.tsx'
import { ToastProvider } from '@src/components/Toast/index.tsx'
import { Toast } from '@src/components/Toast/Toast.tsx'
import { useContent } from '@src/content/index.ts'
import { useSessionManagerStore } from '@src/stores/sessionManagerStore.ts'
import { useEffect, useState } from 'react'
import styles from './home.module.scss'

export const Home = () => {
    const { authed } = useAuthStore()
    const { active, requestingStart, requestStart, error, errorMessage } = useSessionManagerStore()

    const c = useContent().home

    const [showToast, setShowToast] = useState<boolean>(false)

    const requestNewSession = () => {
        if (!requestingStart && !active) {
            setShowToast(false)
            requestStart(true)
        }
    }

    // biome-ignore lint/correctness/useExhaustiveDependencies: only run on error change
    useEffect(() => {
        if (error) {
            setShowToast(true)
            requestStart(false)
        }
    }, [error])

    const showProgress = requestingStart || active

    return (
        <ScreenTransition>
            <div className={styles.home}>
                <div className={styles.spark}>
                    <Icon icon={c.icon} />
                </div>
                <h1 className='type header-1'>{c.h1} 👻</h1>
                <Button
                    color='blue'
                    onClick={requestNewSession}
                    disabled={!authed}
                    iconKey={showProgress ? 'progress' : 'arrow_forward'}
                    icon={
                        showProgress ? (
                            <MdCircularProgress
                                key='progress'
                                indeterminate
                                className={styles.buttonProgressIndicator}
                            />
                        ) : (
                            'arrow_forward'
                        )
                    }>
                    {c.cta}
                </Button>
                {showToast && (
                    <Toast id='start-session-error-toast' title={errorMessage} type='error' />
                )}
                <ToastProvider position='bottom' />
            </div>
        </ScreenTransition>
    )
}
