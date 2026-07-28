import type { Screen } from '@src/screens/index.tsx'
import { create } from 'zustand'

type SessionManager = {
    error: boolean
    setError: (error: boolean) => void
    errorMessage: string
    setErrorMessage: (errorMessage: string) => void
    screen: Screen
    setScreen: (s: Screen) => void

    reset: () => void
}

export const useSessionManagerStore = create<SessionManager>((set) => ({
    error: false,
    setError: (error: boolean) => set((state) => ({ ...state, error })),
    errorMessage: '',
    setErrorMessage: (errorMessage: string) => set((state) => ({ ...state, errorMessage })),
    screen: 'Home',
    setScreen: (s: Screen) => set((state) => ({ ...state, screen: s })),

    reset: () =>
        set((state) => ({
            ...state,
            error: false,
            errorMessage: '',
        })),
}))
