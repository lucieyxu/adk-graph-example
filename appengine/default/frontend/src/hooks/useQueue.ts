import { useFirebase } from '@shared/ts/hooks/useFirebase.ts'
import type { FirestoreWrapper } from '@shared/ts/hooks/useFirestoreQueryListener.ts'
import { useFirestoreQueryListener } from '@shared/ts/hooks/useFirestoreQueryListener.ts'
import { firestoreQueryToString } from '@shared/ts/lib/utils.ts'
import { type Session, SessionZ } from '@shared/types/firestore/session.ts'
import { useSettingsStore } from '@src/stores/settingsStore.ts'
import * as firestore from 'firebase/firestore'

const collectionId = `sessions`

export const useQueue: FirestoreWrapper<Session> = (props) => {
    const { eventId } = useSettingsStore()
    const { db } = useFirebase()
    const baseQuery = firestore.query(firestore.collection(db, collectionId))
    const query = firestore.query(
        baseQuery,
        firestore.where('event_id', '==', eventId),
        firestore.where('started_at', '==', null),
        firestore.orderBy('created_at', 'asc'),
        firestore.limit(999),
    )
    const slug = firestoreQueryToString(query)

    return useFirestoreQueryListener({
        query,
        slug,
        schema: SessionZ,
        select: props && 'select' in props ? props.select : undefined,
    })
}
