'use client'

import { useAuthStore } from '@shared/ts/hooks/useFirebaseAuth.ts'
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
    const { failed, authed } = useAuthStore()
    const { setScreen, error, errorMessage } = useSessionManagerStore()

    const c = useContent().home

    const [showToast, setShowToast] = useState<boolean>(false)

    useEffect(() => {
        if (error) {
            setShowToast(true)
        }
    }, [error])

    return (
        <ScreenTransition>
            <div className={styles.home}>
                <div className={styles.spark}>
                    <Icon icon={c.icon} />
                </div>
                <h1 className={styles.header}>{c.h1} 👻</h1>
                {!failed && (
                    <Button
                        color='blue'
                        onClick={() => {
                            setScreen('Session')
                        }}
                        disabled={!authed || failed}
                        iconKey={'arrow_forward'}
                        icon={'arrow_forward'}>
                        {c.cta}
                    </Button>
                )}
                {failed && (
                    <>
                        <div className=''>Uh oh, something went wrong.</div>
                        <div className=''>We could not find your data.</div>
                    </>
                )}
                {showToast && (
                    <Toast id='start-session-error-toast' title={errorMessage} type='error' />
                )}
                <ToastProvider position='bottom' />
            </div>
        </ScreenTransition>
    )
}
