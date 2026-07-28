import { SessionPublicTokenApi, SessionTokenApi } from '@shared/ts/apis/general.ts'
import { colorsRaw } from '@shared/ts/colors/index.ts'
import { logStyled } from '@shared/ts/lib/utils.ts'
import { getAuth, signInWithCustomToken } from 'firebase/auth'
import { useEffect } from 'react'
import { create } from 'zustand'

type AuthStore = {
    failed: boolean
    setFailed: (failed: boolean) => void
    authed: boolean
    setAuthed: (authed: boolean) => void
    token: string
    setToken: (token: string) => void
}

export const useAuthStore = create<AuthStore>((set) => ({
    failed: false,
    setFailed: (failed: boolean) => set({ failed }),
    authed: false,
    setAuthed: (authed: boolean) => set({ authed }),
    token: '',
    setToken: (token: string) => set({ token }),
}))

// SINGLETON tracker for requesting token
let requestingToken = false
const setRequestingToken = (val: boolean) => {
    requestingToken = val
}

// SINGLETON tracker for requesting auth
let requestingAuth = false
const setRequestingAuth = (val: boolean) => {
    requestingAuth = val
}

export const useFirebaseAuth = (props?: { isPublic: boolean; sessionId: string }) => {
    const { authed, setAuthed, token, setToken, failed, setFailed } = useAuthStore()

    // VERIFY IAP token with server to get custom Firebase token
    // biome-ignore lint/correctness/useExhaustiveDependencies: run once
    useEffect(() => {
        const task = async () => {
            setRequestingToken(true)
            const result = props?.isPublic
                ? await SessionPublicTokenApi.fetch({ uid: props.sessionId })
                : await SessionTokenApi.fetch()
            if (!result || result.error) {
                console.log(
                    ...logStyled(['Firebase', 'Auth failure'], {
                        backgroundColor: colorsRaw['red-600'],
                    }),
                )
                setFailed(true)
            } else {
                setToken(result.token)
            }
            setRequestingToken(false)
        }
        if (token === '' && !authed && !failed && !requestingToken) task()
    }, [])

    // AUTH with custom firebase token
    // biome-ignore lint/correctness/useExhaustiveDependencies: only re-run on token change
    useEffect(() => {
        const task = async () => {
            setRequestingAuth(true)
            const auth = getAuth()
            try {
                await signInWithCustomToken(auth, token)
                console.log(
                    ...logStyled(['Firebase', 'Auth success'], {
                        backgroundColor: colorsRaw['orange-400'],
                    }),
                )
                setAuthed(true)
            } catch {
                auth.signOut()
                console.log(
                    ...logStyled(['Firebase', 'Auth failure'], {
                        backgroundColor: colorsRaw['red-600'],
                    }),
                )
                setAuthed(false)
                setFailed(true)
            }

            setRequestingAuth(false)
        }

        if (token && token !== '' && !authed && !failed && !requestingAuth) task()
    }, [token])

    return { failed, authed, token }
}
