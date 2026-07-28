/** biome-ignore-all lint/correctness/useExhaustiveDependencies: limit onEffect calls */
'use client'

import { SessionCreateApi } from '@shared/ts/apis/general.ts'
import { colorsRaw } from '@shared/ts/colors/index.ts'
import { emit } from '@shared/ts/lib/analytics.ts'
import { dateToFirestoreTimestamp, logStyled, rafPromise } from '@shared/ts/lib/utils.ts'
import { SessionNag } from '@src/components/SessionNag/index.tsx'
import { useSessionFirestore } from '@src/hooks/useSessionFirestore.ts'
import { useSessionManagerStore } from '@src/stores/sessionManagerStore.ts'
import { useSettingsStore } from '@src/stores/settingsStore.ts'
import { type PropsWithChildren, useEffect, useRef } from 'react'
import styles from './SessionManagerProvider.module.scss'

const bg1 = colorsRaw['purple-400']
const bg2 = colorsRaw['purple-600']

const LAST_CALL_SECONDS = 5

export const SessionManagerProvider = ({ children }: PropsWithChildren) => {
    const { sessionTimeoutSeconds, eventId } = useSettingsStore()
    const firestoreSession = useSessionFirestore()
    const session = useSessionManagerStore()
    const inactivityTimeout = useRef<ReturnType<typeof setTimeout>>(null)
    const inactivityLastCallTimeout = useRef<ReturnType<typeof setTimeout>>(null)
    const sessionActiveRef = useRef<boolean>(false)

    //
    // - - - SESSION start & end listeners
    //

    // HANDLE session start request
    useEffect(() => {
        const task = async () => {
            session.setInitiating(true)
            session.setError(false)
            session.setErrorMessage('')
            try {
                if (!firestoreSession.authed) {
                    await rafPromise() // ensure we render a frame before setting error to true again
                    throw 'Failed to authenticate with Firebase'
                }
                const result = await SessionCreateApi.fetch({ name: 'default', eventId })
                if (!result || result.error)
                    throw `Failed to get session id from server: ${result?.message}`
                session.setID(result.id)
            } catch (e) {
                error(String(e))
            }
        }
        if (session.requestingStart) task()
    }, [session.requestingStart])

    // HANDLE session start request success
    useEffect(() => {
        // User data created, and RTDB data stream successfully initialized
        if (!firestoreSession.error && session.id !== '' && !session.active) {
            start()
        }
    }, [firestoreSession.error, session.id])

    // HANDLE session start request error, specifically Firestore data timeout
    useEffect(() => {
        if (firestoreSession.errorMessage === 'timeout') {
            error('Failed to get session data from RTDB')
        }
    }, [firestoreSession.errorMessage])

    // HANDLE session end request
    useEffect(() => {
        if (session.requestingEnd) end()
    }, [session.requestingEnd])

    useEffect(() => {
        sessionActiveRef.current = session.active
    }, [session.active])

    //
    // - - - SESSION start, end, and error tasks
    //

    // START new session
    const start = () => {
        const id = session.id
        session.setActive(true)
        session.setInactive(false)
        console.log(...logStyled(['Session', 'start', { id }], { backgroundColor: bg1 }))
        emit('app_session_start')
        session.setScreen('Session')

        if (firestoreSession?.setData) {
            firestoreSession.setData((data) => ({
                ...data,
                startedAt: dateToFirestoreTimestamp(new Date()),
            }))
        } else {
            console.log('Warning: Failed to write startedAt timestamp to Firestore')
        }
    }

    // ERROR starting new session
    const error = (message: string) => {
        session.setErrorMessage(message)
        console.log('ERROR! Failed to start session')
        session.setID('')
        session.setActive(false)
        session.setError(true)
    }

    // END session
    const end = () => {
        if (!session.active) return
        const id = session.id
        const endedAt = Date.now()
        const duration = Math.round((endedAt - session.startedAt) / 1000)
        console.log(...logStyled(['Session', 'end', { id }], { backgroundColor: bg2 }))
        emit('app_session_end', { duration })
        session.setScreen('Home')
        session.setNagState('closed')

        if (firestoreSession?.setData) {
            firestoreSession.setData((data) => ({
                ...data,
                completedAt: dateToFirestoreTimestamp(new Date()),
            }))
        } else {
            console.log('Warning: Failed to write completedAt timestamp to Firestore')
        }
    }

    //
    // - - - INACTIVITY tracker
    //

    // LISTENERS on document for generic user activity
    useEffect(() => {
        const activity = () => {
            if (inactivityLastCallTimeout.current) clearTimeout(inactivityLastCallTimeout.current)
            if (inactivityTimeout.current) clearTimeout(inactivityTimeout.current)

            inactivityTimeout.current = setTimeout(() => {
                if (sessionActiveRef.current) {
                    session.setNagState('inactive')
                    inactivityTimeout.current = setTimeout(() => {
                        if (sessionActiveRef.current) {
                            session.setInactive(true)
                        }
                    }, 1000 * LAST_CALL_SECONDS)
                }
            }, 1000 * 5)
        }

        document.body.addEventListener('click', activity)
        document.body.addEventListener('touchstart', activity)

        return () => {
            document.body.removeEventListener('click', activity)
            document.body.removeEventListener('touchstart', activity)
        }
    }, [])

    // HANDLE timeout duration change in settings store
    useEffect(() => {
        if (!session.active) return
        if (inactivityTimeout.current) clearTimeout(inactivityTimeout.current)
        inactivityTimeout.current = setTimeout(end, 1000 * sessionTimeoutSeconds)
    }, [sessionTimeoutSeconds])

    // HANDLE timeout event with current state
    useEffect(() => {
        if (session.inactive) end()
    }, [session.inactive])

    return (
        <div className={styles.SessionManager}>
            {children}
            <SessionNag />
        </div>
    )
}
