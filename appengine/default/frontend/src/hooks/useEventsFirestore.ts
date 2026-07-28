import { useFirebase } from '@shared/ts/hooks/useFirebase.ts'
import type { FirestoreWrapper } from '@shared/ts/hooks/useFirestoreQueryListener.ts'
import { useFirestoreQueryListener } from '@shared/ts/hooks/useFirestoreQueryListener.ts'
import { firestoreQueryToString } from '@shared/ts/lib/utils.ts'
import { type Event, EventZ } from '@shared/types/firestore/event.ts'
import * as firestore from 'firebase/firestore'

const collectionId = `events`

export const useEventsFirestore: FirestoreWrapper<Event> = (props) => {
    const { db } = useFirebase()
    const baseQuery = firestore.query(firestore.collection(db, collectionId))
    const query = props && 'query' in props ? firestore.query(baseQuery, ...props.query) : baseQuery
    const slug = firestoreQueryToString(query)

    return useFirestoreQueryListener({
        query,
        slug,
        schema: EventZ,
        select: props && 'select' in props ? props.select : undefined,
    })
}
