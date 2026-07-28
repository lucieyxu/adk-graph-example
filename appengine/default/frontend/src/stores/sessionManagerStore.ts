import * as analytics from '@shared/ts/lib/analytics.ts'
import type { Screen } from '@src/screens/index.tsx'
import { create } from 'zustand'
export type NagState = 'inactive' | 'confirm' | 'closed'

type SessionManager = {
    requestingStart: boolean
    requestStart: (requestingStart?: boolean) => void
    requestingEnd: boolean
    requestEnd: (requestingEnd?: boolean) => void
    error: boolean
    setError: (error: boolean) => void
    errorMessage: string
    setErrorMessage: (errorMessage: string) => void
    initiating: boolean
    setInitiating: (initiating: boolean) => void
    id: string
    setID: (id: string) => void
    active: boolean
    startedAt: number
    setActive: (active: boolean) => void
    inactive: boolean
    setInactive: (inactive: boolean) => void
    screen: Screen
    setScreen: (s: Screen) => void
    nagState: NagState
    setNagState: (nagState: NagState) => void
    requestEndWithConfirmation: () => void
    reset: () => void
}

export const useSessionManagerStore = create<SessionManager>((set) => ({
    requestingStart: false,
    requestStart: (val?: boolean) => {
        const requestingStart = val === undefined ? true : val
        return set((state) => ({ ...state, requestingStart }))
    },
    requestingEnd: false,
    requestEnd: (val?: boolean) => {
        const requestingEnd = val === undefined ? true : val
        return set((state) => ({ ...state, requestingEnd }))
    },
    error: false,
    setError: (error: boolean) => set((state) => ({ ...state, error })),
    errorMessage: '',
    setErrorMessage: (errorMessage: string) => set((state) => ({ ...state, errorMessage })),
    initiating: false,
    setInitiating: (initiating: boolean) => set((state) => ({ ...state, initiating })),
    id: '',
    setID: (id) => {
        analytics.setSessionId(id)
        return set((state) => ({ ...state, id }))
    },
    active: false,
    startedAt: 0,
    setActive: (active: boolean) => set((state) => ({ ...state, active, startedAt: Date.now() })),
    inactive: false,
    setInactive: (inactive: boolean) => set((state) => ({ ...state, inactive })),
    screen: 'Home',
    setScreen: (s: Screen) => set((state) => ({ ...state, screen: s })),
    nagState: 'closed',
    setNagState: (nagState: NagState) => set({ nagState }),
    requestEndWithConfirmation: () =>
        set((state) => {
            if (state.active) {
                return { nagState: 'confirm' }
            } else {
                return {}
            }
        }),
    reset: () =>
        set((state) => ({
            ...state,
            requestingStart: false,
            requestingEnd: false,
            error: false,
            errorMessage: '',
            id: '',
            active: false,
            startedAt: 0,
            inactive: false,
        })),
}))
