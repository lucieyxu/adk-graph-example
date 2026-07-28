import { colorsRaw } from '@shared/ts/colors/index.ts'
import { useDeep } from '@shared/ts/hooks/useDeep.ts'
import { logStyled, uuid } from '@shared/ts/lib/utils.ts'
import type { Database, DatabaseReference } from 'firebase/database'
import { onValue, ref, runTransaction } from 'firebase/database'
import { useEffect, useRef } from 'react'
import type { output, infer as ZodInfer, ZodObject, ZodRawShape, ZodSafeParseResult } from 'zod'
import * as z from 'zod'
import { create } from 'zustand'
import { useFirebase } from './useFirebase.ts'
import { useFirebaseAuth } from './useFirebaseAuth.ts'

const DEBUG = false

/**
 *
 * useRTDBListener is a hook that provides a simple way to read and write data from a Firestore
 * Realtime Database.
 * It uses internal non-React module state to share Firebase RTDB "onValue" listeners, and uses
 * Zustand to share state. This allows numerous components to directly invoke the hook without
 * creating new listeners or redundant state.
 * It uses Zod for runtime typechecking -- ensuring that everything going into or out of the
 * database conforms to the expected schema.
 *
 * @param path: string - the query to make to the database, i.e. "/sessions/abc-123" (dummy user id)
 * @param schema: ZodObject - a zod object to type the data that you expect to read & write. This represents the shape of the data at the node for the "path" query.
 * @param select: (data: T) => T | unknown - a selector function (where T is the type represented by "schema") that takes the response from the database and returns an optional selection or transformation of the data, to minimize unecessary re-renders
 *
 * @returns data: T - the data from the database
 * @returns setData: async ( data: T ) => T - a setter functions that calls an atomic write transaction on the database, receiving the current state as input. Modify the data, and return the result to have it written.
 *
 * IDEAL usage:
 *
 * Create a new hook, that can be then re-used by other components. Within this hook, specify your
 * zod schema and path for the query. Then when re-using this hook, you can optionally pass a
 * selector function to only re-render when a subset of the data changes.
 *
 *
 * 

const ExampleZ = z.strictObject({
    hello: z.string(),
    nested: z.strictObject({
        world: z.string(),
    }),
})
type Example = z.infer<typeof ExampleZ>

const _useExampleRTDB: RTDBWrapper<Example> = (select?: RTDBSelector) => {
    return useRTDBListener({
        path: '/example',
        schema: ExampleZ,
        select,
    })
}

// elsewhere in the app
const { data, setData } = _useExampleRTDB() // entire data object
// OR
const { data, setData } = _useExampleRTDB((data) => data.nested.world) // subset of data object

 * 
 */

interface Input<Z> {
    path: string
    schema: Z
    config?: {
        isPublic: boolean
        sessionId: string
    }
}

interface InputSelect<Z, P> extends Input<Z> {
    select: P
}

interface Output<T> {
    authed: boolean
    error: false
    errorMessage: string
    data: T
    setData: (set: (data: T) => T) => Promise<void>
}

interface OutputSelect<T, P extends (data: T) => unknown> {
    authed: boolean
    error: false
    errorMessage: string
    data: ReturnType<P>
    setData: (set: (data: T) => T) => Promise<void>
}

type RTDBError = {
    authed: boolean
    error: true
    errorMessage: string
    data: undefined
    setData: undefined
}

export type RTDBWrapper<T> = {
    (): Output<T> | RTDBError
    <P extends (data: T) => unknown>(select: P): OutputSelect<T, P> | RTDBError
}

// biome-ignore lint/suspicious/noExplicitAny: intermediary any, still checked on input and output
export type RTDBSelector = any

export function useRTDBListener<
    S extends ZodRawShape,
    Z extends ZodObject<S>,
    T extends ZodInfer<Z>,
>(props: Input<Z>): Output<T> | RTDBError

export function useRTDBListener<
    S extends ZodRawShape,
    Z extends ZodObject<S>,
    T extends ZodInfer<Z>,
    P extends (data: T) => unknown,
>(props: InputSelect<Z, P>): OutputSelect<T, P> | RTDBError

export function useRTDBListener<
    S extends ZodRawShape,
    Z extends ZodObject<S>,
    T extends ZodInfer<Z>,
    P extends (data: T) => unknown,
>(props: Input<Z> | InputSelect<Z, P>): Output<T> | OutputSelect<T, P> | RTDBError {
    // DESTRUCTURE props
    const { path, schema } = props

    // HOOKS
    const isPublic = props.config?.isPublic === true
    const sessionId = String(props.config?.sessionId)
    const { rtdb } = useFirebase({ isPublic, sessionId })
    const { authed } = useFirebaseAuth({ isPublic, sessionId })
    const invocationID = useRef<string>('')
    const { record, setRecord } = useRecordStore(
        useDeep((state) => {
            const record = state.records[path] as T
            const setRecord = state.setRecord
            if (path === '' || record === undefined) {
                return { record: undefined, setRecord }
            } else if ('select' in props && typeof props.select !== 'undefined') {
                return { record: props.select(record), setRecord }
            } else {
                return { record, setRecord }
            }
        }),
    )

    const listener = listeners[path]

    // CREATE new listener instance
    const create = () => {
        const l = new Listener({
            rtdb,
            path: path,
            invocationID: invocationID.current,
            setter: setRecord,
            schema: schema,
        })
        listeners[l.path] = l
    }

    // DESTROY this invocation of the hook
    const destroy = () => {
        const l = listeners[path]
        if (l) l.removeInvocation(invocationID.current)
        invocationID.current = ''
    }

    // CREATE & DESTROY when the path changes or component unmounts
    // biome-ignore lint/correctness/useExhaustiveDependencies: create and destroy helpers
    useEffect(() => {
        const shouldMount = path !== '' && authed
        if (shouldMount) {
            // CREATE new invocation id
            invocationID.current = uuid()
            const l = listeners[path]
            if (l === undefined) {
                create()
            } else {
                // ADD invocation to existing listener
                l.addInvocation(invocationID.current)
            }
        }

        // CLEANUP the invoking component exists in the DOM but no longer subscribes to a data stream
        const shouldUnmount = !shouldMount && invocationID.current !== ''
        if (shouldUnmount) destroy()

        // CLEANUP the invoking component has been removed from the DOM
        return () => {
            if (invocationID.current !== '') destroy()
        }
    }, [path, authed])

    if (!record) return { ...error, authed, errorMessage: '' }
    if (!listener) return { ...error, authed, errorMessage: '' }
    if (listener.neverReceivedData) return { ...error, authed, errorMessage: 'timeout' }

    //
    // SUCCESS return data and setter
    //
    const setData = async (set: (data: T) => T) => {
        await listener.setRemote(set)
    }

    if ('select' in props && typeof props.select !== 'undefined') {
        const data = record as ReturnType<P>
        return { data, setData, authed, error: false, errorMessage: '' }
    } else {
        const data = record as T
        return { data, setData, authed, error: false, errorMessage: '' }
    }
}

//
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - INTERNAL
//

const error: RTDBError = {
    authed: false,
    error: true,
    errorMessage: '',
    data: undefined,
    setData: undefined,
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

type ListenerRecord<S extends ZodRawShape, Z extends ZodObject<S>, T extends ZodInfer<Z>> = Record<
    string,
    Listener<S, Z, T>
>

// biome-ignore lint/suspicious/noExplicitAny: Leave open for reuse with generic ZodObjects unknown at compile time
const listeners: ListenerRecord<any, any, any> = {}

interface ListenerProps<Z, T> {
    rtdb: Database
    path: string
    invocationID: string
    schema: Z
    setter: (key: string, data: T | undefined) => void
}

class Listener<S extends ZodRawShape, Z extends ZodObject<S>, T extends ZodInfer<Z>> {
    ref: DatabaseReference
    schema: Z
    invocations: Array<string>
    setLocal: (key: string, data: T | undefined) => void
    unsubscribe: () => void

    path: string
    dataReceived: boolean
    neverReceivedData: boolean
    timeout: ReturnType<typeof setTimeout> | null

    constructor(props: ListenerProps<Z, T>) {
        this.path = props.path
        this.ref = ref(props.rtdb, props.path)
        this.invocations = [props.invocationID]
        this.setLocal = props.setter
        this.schema = props.schema
        this.dataReceived = false
        this.timeout = setTimeout(() => {
            this.onTimeout()
        }, 5 * 1000)
        this.neverReceivedData = false

        this.unsubscribe = onValue(this.ref, (snapshot) => {
            const data = snapshot.val()
            this.onUpdate(data)
        })

        if (DEBUG) {
            console.log(
                ...logStyled(['RTDB', 'setup listener:', this.path], {
                    backgroundColor: colorsRaw['purple-400'],
                }),
            )
        }

        this.tallyInvocations()
    }

    onUpdate(data: T) {
        if (this.timeout) clearTimeout(this.timeout)
        const parsed = this.parse(data)
        if (parsed.success) {
            this.setLocal(this.path, parsed.data as T)
            this.dataReceived = true
        } else {
            console.error('Data from RTDB failed to conform to specified type for query', this.path)
            console.log(parsed.error)
            this.dataReceived = false
        }
    }

    onTimeout() {
        console.log('ERROR! Timed out waiting for data from RTDB for query', this.path)
        this.neverReceivedData = true
        this.setLocal(this.path, {} as T)
    }

    parse(record: unknown): ZodSafeParseResult<ZodInfer<Z>> {
        const parsed: ZodSafeParseResult<ZodInfer<Z>> = this.schema.safeParse(record)
        return parsed
    }

    async setRemote(set: (data: T) => T) {
        try {
            // GET a lock on the document by initiating a transaction
            // this helps prevent unpredictable data contention errors particularly on connections
            // with high latency, i.e, clients running the demo in other countries
            await runTransaction(this.ref, (current: T) => {
                // CREATE zod-parsed version of data, so that empty objects or arrays are
                // instantiated, and converted to an actual array if needed, and can be accessed
                // as expected during the set transform function
                const currentParsed = this.parse(current)
                if (!currentParsed.success) {
                    console.error(
                        `Failed to update value for Firestore entity ${this.path}`,
                        currentParsed.error,
                    )
                    return
                }

                // MODIFY state
                const draft = set(currentParsed.data as T)

                // TYPE check before writing to rtdb
                const parsed = this.parse(draft)
                if (!parsed.success) {
                    console.error(
                        `Failed to update value for RTDB entity ${this.path}`,
                        parsed.error,
                    )
                    return
                }

                // ENCODE any arrays for storage in RTDB where there are no arrays, only objects
                return z.encode(this.schema, parsed.data as output<Z>)
            })
        } catch (e) {
            console.error(`Failed to update value for RTDB entity ${this.path}`, e)
        }
    }

    addInvocation(invocationID: string) {
        this.invocations.push(invocationID)
        this.tallyInvocations()
    }

    removeInvocation(invocationID: string) {
        this.invocations = this.invocations.filter((id) => id !== invocationID)
        if (this.invocations.length === 0) this.destroy()
        this.tallyInvocations()
    }

    tallyInvocations() {
        if (DEBUG) {
            console.log(
                ...logStyled(['RTDB', 'invocation count:', this.invocations.length], {
                    backgroundColor: colorsRaw['purple-400'],
                }),
            )
        }
    }

    destroy() {
        // CLEAR timeout
        if (this.timeout) clearTimeout(this.timeout)

        // UNSUBSCRIBE rtdb subscription
        this.unsubscribe()

        // DELETE record from zustand store by setting to undefined
        this.setLocal(this.path, undefined)

        // DELETE Listener instance
        delete listeners[this.path]

        if (DEBUG) {
            console.log(
                ...logStyled(['RTDB', 'cleanup listener:', this.path], {
                    backgroundColor: colorsRaw['purple-400'],
                }),
            )
        }
    }
}
