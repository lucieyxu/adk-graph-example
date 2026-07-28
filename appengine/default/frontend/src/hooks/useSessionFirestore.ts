import type { FirestoreWrapper } from '@shared/ts/hooks/useFirestoreDocListener.ts'
import { useFirestoreDocListener } from '@shared/ts/hooks/useFirestoreDocListener.ts'
import type { Session } from '@shared/types/firestore/session.ts'
import { SessionZ } from '@shared/types/firestore/session.ts'
import { useSessionManagerStore } from '@src/stores/sessionManagerStore.ts'

export const useSessionFirestore: FirestoreWrapper<Session> = (props) => {
    const session = useSessionManagerStore()

    return useFirestoreDocListener({
        // can omit this 'config' key and object
        config: {
            isPublic: false,
            sessionId: '',
        },
        path: session.id !== '' ? `/sessions/${session.id}` : '',
        schema: SessionZ,
        select: props && 'select' in props ? props.select : undefined,
    })
}
