import { SessionRankApi } from '@shared/ts/apis/general.ts'
import { colorsRaw } from '@shared/ts/colors/index.ts'
import { useDeep } from '@shared/ts/hooks/useDeep.ts'
import { logStyled, uuid } from '@shared/ts/lib/utils.ts'
import type { SessionRankOutput } from '@shared/types/session/rank.ts'
import { useEffect, useRef } from 'react'
import { create } from 'zustand'

// biome-ignore lint/suspicious/noExplicitAny: Allow any type for dependency array
type Dependencies = Array<any>

interface UseRankProps {
    sessionId: string
    dependencies?: Dependencies
}

const DEBUG = false
const INTERVAL_SECONDS = 5

export const useRank = (props: UseRankProps) => {
    const { sessionId, dependencies } = props

    const invocationId = useRef<string>('')

    const { record, setRecord } = useRecordStore(
        useDeep((state) => {
            const record = state.records[sessionId] as SessionRankOutput
            const setRecord = state.setRecord
            if (sessionId === '' || record === undefined) {
                return { record: undefined, setRecord }
            } else {
                return { record, setRecord }
            }
        }),
    )

    const listener = listeners[sessionId]

    // CREATE new listener instance
    const create = () => {
        const l = new Listener({
            sessionId,
            invocationId: invocationId.current,
            setter: setRecord,
        })
        listeners[l.sessionId] = l
    }

    // DESTROY this invocation of the hook
    const destroy = () => {
        const l = listeners[sessionId]
        if (l) l.removeInvocation(invocationId.current)
        invocationId.current = ''
    }

    // CREATE & DESTROY when the sessionId changes or component unmounts
    // biome-ignore lint/correctness/useExhaustiveDependencies: create and destroy helpers
    useEffect(() => {
        const shouldMount = sessionId !== ''
        if (shouldMount) {
            // CREATE new invocation id
            invocationId.current = uuid()
            const l = listeners[sessionId]
            if (l === undefined) {
                create()
            } else {
                // ADD invocation to existing listener
                l.addInvocation(invocationId.current)
            }
        }

        // CLEANUP the invoking component exists in the DOM but no longer subscribes to a data stream
        const shouldUnmount = !shouldMount && invocationId.current !== ''
        if (shouldUnmount) destroy()

        // CLEANUP the invoking component has been removed from the DOM
        return () => {
            if (invocationId.current !== '') destroy()
        }
    }, [sessionId])

    // biome-ignore lint/suspicious/noExplicitAny: Strange issues ts not narrowing this
    const dependenciesNarrowed = (dependencies !== undefined ? dependencies : []) as Array<any>
    // biome-ignore lint/correctness/useExhaustiveDependencies: only specified deps
    useEffect(() => {
        if (listener) listener.fetch()
    }, [...dependenciesNarrowed])

    if (!record) return null
    if (!listener) return null
    if (listener.neverReceivedData) return null

    //
    // SUCCESS return data
    //
    return record as SessionRankOutput
}

type ListenerRecord = Record<string, Listener>

const listeners: ListenerRecord = {}

interface ListenerProps {
    sessionId: string
    invocationId: string
    setter: (key: string, data: SessionRankOutput | undefined) => void
}

class Listener {
    invocations: Array<string>
    sessionId: string
    dataReceived: boolean
    neverReceivedData: boolean
    timeout: ReturnType<typeof setTimeout> | null
    interval: ReturnType<typeof setInterval> | null
    setLocal: (key: string, data: SessionRankOutput | undefined) => void

    constructor(props: ListenerProps) {
        this.sessionId = props.sessionId
        this.invocations = [props.invocationId]
        this.setLocal = props.setter
        this.dataReceived = false
        this.timeout = setTimeout(() => {
            this.onTimeout()
        }, 5 * 1000)
        this.interval = setInterval(() => {
            this.fetch()
        }, 1000 * INTERVAL_SECONDS)
        this.neverReceivedData = false

        if (DEBUG) {
            console.log(
                ...logStyled(['Rank', 'setup listener:', this.sessionId], {
                    backgroundColor: colorsRaw['green-400'],
                }),
            )
        }

        this.tallyInvocations()

        this.fetch()
    }

    async fetch() {
        if (DEBUG) {
            console.log(
                ...logStyled(['Rank', 'querying rank:', this.invocations.length], {
                    backgroundColor: colorsRaw['green-400'],
                }),
            )
        }
        const data = await SessionRankApi.fetch({ sessionId: this.sessionId })

        if (this.timeout) clearTimeout(this.timeout)
        if (data && !data.error) {
            this.setLocal(this.sessionId, data)

            this.dataReceived = true
        } else {
            console.error(`Failed to fetch rank data for sessionId:`, this.sessionId)
            if (data) console.log(data.error)
            this.dataReceived = false
        }
    }

    onTimeout() {
        const message = `ERROR! Timed out waiting for rank data for sessionId: ${this.sessionId}`
        console.log(message)
        this.neverReceivedData = true
    }

    addInvocation(invocationId: string) {
        this.invocations.push(invocationId)
        this.tallyInvocations()
    }

    removeInvocation(invocationId: string) {
        this.invocations = this.invocations.filter((id) => id !== invocationId)
        if (this.invocations.length === 0) this.destroy()
        this.tallyInvocations()
    }

    tallyInvocations() {
        if (DEBUG) {
            console.log(
                ...logStyled(['Rank', 'invocation count:', this.invocations.length], {
                    backgroundColor: colorsRaw['green-400'],
                }),
            )
        }
    }

    unsubscribe() {
        if (this.interval) clearInterval(this.interval)
    }

    destroy() {
        // CLEAR timeout
        if (this.timeout) clearTimeout(this.timeout)

        // UNSUBSCRIBE firestore subscription
        this.unsubscribe()

        // DELETE record from zustand store by setting to undefined
        this.setLocal(this.sessionId, undefined)

        // DELETE Listener instance
        delete listeners[this.sessionId]

        if (DEBUG) {
            console.log(
                ...logStyled(['Rank', 'cleanup listener:', this.sessionId], {
                    backgroundColor: colorsRaw['green-400'],
                }),
            )
        }
    }
}

type RecordStore = {
    records: Record<string, unknown>
    setRecord: (key: string, data: unknown) => void
}

// INTERNAL only
const useRecordStore = create<RecordStore>((set) => ({
    records: {},
    setRecord: (key: string, data: unknown) =>
        set((s) => {
            const draft = { ...s }
            if (data === undefined) {
                delete draft.records[key]
            } else {
                draft.records[key] = data
            }
            return draft
        }),
}))
