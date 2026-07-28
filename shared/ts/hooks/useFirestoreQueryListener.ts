import { colorsRaw } from '@shared/ts/colors/index.ts'
import { useDeep } from '@shared/ts/hooks/useDeep.ts'
import { logStyled, snakeToCamelObj, uuid } from '@shared/ts/lib/utils.ts'
import type { Firestore, Query, QuerySnapshot } from 'firebase/firestore'
import * as firestore from 'firebase/firestore'
import { useEffect, useRef } from 'react'
import type { infer as ZodInfer, ZodObject, ZodRawShape } from 'zod'
import { create } from 'zustand'
import { useFirebase } from './useFirebase.ts'
import { useFirebaseAuth } from './useFirebaseAuth.ts'

const DEBUG = false

/**
 *
 * useFirestoreListener is a hook that provides a simple way to read and write data from a Firestore
 * Database.
 * It uses internal non-React module state to share Firebase Firestore "onSnapshot" listeners, and uses
 * Zustand to share state. This allows numerous components to directly invoke the hook without
 * creating new listeners or redundant state.
 * It uses Zod for runtime typechecking -- ensuring that everything going into or out of the
 * database conforms to the expected schema.
 *
 * @param collection: string - the name of the collection in the Firestore database
 * @param path: string - the path to make to the database, i.e. "/sessions/abc-123" (dummy user id)
 * @param schema: ZodObject - a zod object to type the data that you expect to read & write. This represents the shape of the data at the node for the "path" path.
 * @param select: (data: T) => T | unknown - a selector function (where T is the type represented by "schema") that takes the response from the database and returns an optional selection or transformation of the data, to minimize unecessary re-renders
 *
 * @returns data: T - the data from the database
 *
 * IDEAL usage:
 *
 * Create a new hook, that can be then re-used by other components. Within this hook, specify your
 * zod schema and path for the path. Then when re-using this hook, you can optionally pass a
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

const _useExampleFirestore: FirestoreWrapper<Example> = (select?: FirestoreSelector) => {
    return useFirestoreListener({
        path: '/example',
        schema: ExampleZ,
        select,
    })
}

// elsewhere in the app
const { data } = _useExampleFirestore() // entire data object
// OR
const { data } = _useExampleFirestore((data) => data.nested.world) // subset of data object

 * 
 */

interface Input<Z> {
    query: Query
    slug: string
    schema: Z
}

interface InputSelect<Z, P> extends Input<Z> {
    select: P | undefined
}

interface Output<T> {
    authed: boolean
    error: false
    errorMessage: string
    data: Array<T>
}

interface OutputSelect<T, P extends (data: T) => unknown> {
    authed: boolean
    error: false
    errorMessage: string
    data: Array<ReturnType<P>>
}

type FirestoreError = {
    authed: boolean
    error: true
    errorMessage: string
    data: undefined
}

type FirestoreWrapperParams<P> = {
    query: Array<firestore.QueryLimitConstraint>
    select: P
}

type FirestoreWrapperParamsNoSelect<P> = Omit<FirestoreWrapperParams<P>, 'select'>
type FirestoreWrapperParamsNoQuery<P> = Omit<FirestoreWrapperParams<P>, 'query'>

export type FirestoreWrapper<T> = {
    // PARTIAL document data
    <P extends (data: T) => unknown>(
        props: FirestoreWrapperParams<P>,
    ): OutputSelect<T, P> | FirestoreError
    <P extends (data: T) => unknown>(
        props: FirestoreWrapperParamsNoQuery<P>,
    ): OutputSelect<T, P> | FirestoreError

    // COMPLETE document data
    <P extends (data: T) => unknown>(
        props?: FirestoreWrapperParamsNoSelect<P>,
    ): Output<T> | FirestoreError
}

// biome-ignore lint/suspicious/noExplicitAny: intermediary any, still checked on input and output
export type FirestoreSelector = any

export function useFirestoreQueryListener<
    S extends ZodRawShape,
    Z extends ZodObject<S>,
    T extends ZodInfer<Z>,
>(props: Input<Z>): Output<T> | FirestoreError

export function useFirestoreQueryListener<
    S extends ZodRawShape,
    Z extends ZodObject<S>,
    T extends ZodInfer<Z>,
    P extends (data: T) => unknown,
>(props: InputSelect<Z, P>): OutputSelect<T, P> | FirestoreError

export function useFirestoreQueryListener<
    S extends ZodRawShape,
    Z extends ZodObject<S>,
    T extends ZodInfer<Z>,
    P extends (data: T) => unknown,
>(props: Input<Z> | InputSelect<Z, P>): Output<T> | OutputSelect<T, P> | FirestoreError {
    // DESTRUCTURE props
    const { slug, schema, query } = props

    // HOOKS
    const { db } = useFirebase()
    const { authed } = useFirebaseAuth()
    const invocationID = useRef<string>('')
    const { record, setRecord } = useRecordStore(
        useDeep((state) => {
            const record = state.records[slug] as Array<T>
            const setRecord = state.setRecord
            if (slug === '' || record === undefined) {
                return { record: undefined, setRecord }
            } else if ('select' in props && props.select && props.select !== undefined) {
                // @ts-expect-error we are sure select is not undefined
                return { record: record.map((r: T) => props.select(r)), setRecord }
            } else {
                return { record, setRecord }
            }
        }),
    )

    //
    // TODO validate schema
    //
    // Arrays are fine, unlike RTDB
    //

    const listener = listeners[slug]

    // CREATE new listener instance
    const create = () => {
        const l = new Listener({
            db,
            query,
            slug,
            invocationID: invocationID.current,
            setter: setRecord,
            schema: schema,
        })
        listeners[l.slug] = l
    }

    // DESTROY this invocation of the hook
    const destroy = () => {
        const l = listeners[slug]
        if (l) l.removeInvocation(invocationID.current)
        invocationID.current = ''
    }

    // CREATE & DESTROY when the slug changes or component unmounts
    // biome-ignore lint/correctness/useExhaustiveDependencies: create and destroy helpers
    useEffect(() => {
        const shouldMount = slug !== '' && authed
        if (shouldMount) {
            // CREATE new invocation id
            invocationID.current = uuid()
            const l = listeners[slug]
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
    }, [slug, authed])

    if (!record) return { ...error, authed, errorMessage: '' }
    if (!listener) return { ...error, authed, errorMessage: '' }
    if (listener.neverReceivedData) return { ...error, authed, errorMessage: 'timeout' }

    //
    // SUCCESS return data
    //

    if ('select' in props && typeof props.select !== 'undefined') {
        const data = record as Array<ReturnType<P>>
        return { data, authed, error: false, errorMessage: '' }
    } else {
        const data = record as Array<T>
        return { data, authed, error: false, errorMessage: '' }
    }
}

//
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - INTERNAL
//

const error: FirestoreError = {
    authed: false,
    error: true,
    errorMessage: '',
    data: undefined,
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
    db: Firestore
    query: Query
    slug: string
    invocationID: string
    schema: Z
    setter: (key: string, data: Array<T> | undefined) => void
}

class Listener<S extends ZodRawShape, Z extends ZodObject<S>, T extends ZodInfer<Z>> {
    db: Firestore
    query: Query
    slug: string
    schema: Z
    invocations: Array<string>
    setLocal: (key: string, data: Array<T> | undefined) => void
    unsubscribe: () => void

    dataReceived: boolean
    neverReceivedData: boolean
    timeout: ReturnType<typeof setTimeout> | null

    constructor(props: ListenerProps<Z, T>) {
        this.db = props.db
        this.query = props.query
        this.slug = props.slug
        this.invocations = [props.invocationID]
        this.setLocal = props.setter
        this.schema = props.schema
        this.dataReceived = false
        this.timeout = setTimeout(() => {
            this.onTimeout()
        }, 5 * 1000)
        this.neverReceivedData = false

        this.unsubscribe = firestore.onSnapshot(this.query, (snapshot: QuerySnapshot) => {
            const data: Array<unknown> = []
            snapshot.forEach((doc) => {
                data.push(doc.data())
            })

            this.onUpdate(data)
        })

        if (DEBUG) {
            console.log(
                ...logStyled(['Firestore', 'setup listener:', this.slug], {
                    backgroundColor: colorsRaw['purple-400'],
                }),
            )
        }

        this.tallyInvocations()
    }

    onUpdate(data: Array<unknown>) {
        if (this.timeout) clearTimeout(this.timeout)
        const parsed = this.parse(data)
        this.setLocal(this.slug, parsed as Array<T>)
        this.dataReceived = true
    }

    onTimeout() {
        console.log('ERROR! Timed out waiting for data from Firestore for path', this.slug)
        this.neverReceivedData = true
        this.setLocal(this.slug, [] as Array<T>)
    }

    parse(record: unknown): Array<ZodInfer<Z>> {
        const parsed: ZodInfer<Z>[] = []

        if (!Array.isArray(record)) {
            console.error('Data in record is somehow not an array!')
            return parsed
        }

        record.forEach((r) => {
            const rCamel = snakeToCamelObj(r, [])
            const result = this.schema.safeParse(rCamel)
            if (result.error) {
                console.warn(
                    'Data from Firestore failed to conform to specified type for query',
                    this.slug,
                )
                console.log(r)
                console.log(result.error)
            } else {
                parsed.push(result.data)
            }
        })

        return parsed
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
                ...logStyled(['Firestore', 'invocation count:', this.invocations.length], {
                    backgroundColor: colorsRaw['purple-400'],
                }),
            )
        }
    }

    destroy() {
        // CLEAR timeout
        if (this.timeout) clearTimeout(this.timeout)

        // UNSUBSCRIBE firestore subscription
        this.unsubscribe()

        // DELETE record from zustand store by setting to undefined
        this.setLocal(this.slug, undefined)

        // DELETE Listener instance
        delete listeners[this.slug]

        if (DEBUG) {
            console.log(
                ...logStyled(['Firestore', 'cleanup listener:', this.slug], {
                    backgroundColor: colorsRaw['purple-400'],
                }),
            )
        }
    }
}
