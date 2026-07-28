/** biome-ignore-all lint/correctness/useExhaustiveDependencies: limit onEffect calls */
'use client'

import { useSessionFirestore } from '@src/hooks/useSessionFirestore.ts'
import { useSessionManagerStore } from '@src/stores/sessionManagerStore.ts'
import { type PropsWithChildren, useEffect } from 'react'
import styles from './SessionManagerProvider.module.scss'

export const SessionManagerProvider = ({ children }: PropsWithChildren) => {
    const userSessionFirestore = useSessionFirestore()
    const session = useSessionManagerStore()

    //
    // - - - SESSION start & end listeners
    //

    // HANDLE session start request error, specifically Firestore data timeout
    useEffect(() => {
        if (userSessionFirestore.errorMessage === 'timeout') {
            error('Failed to get session data from Firestore')
        }
    }, [userSessionFirestore.errorMessage])

    // ERROR starting new session
    const error = (message: string) => {
        session.setErrorMessage(message)
        console.log('ERROR! Failed to start session')
        session.setError(true)
    }

    return <div className={styles.SessionManager}>{children}</div>
}
