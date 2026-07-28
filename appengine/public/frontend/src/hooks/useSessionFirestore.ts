import type {
    FirestoreSelector,
    FirestoreWrapper,
} from '@shared/ts/hooks/useFirestoreDocListener.ts'
import { useFirestoreDocListener } from '@shared/ts/hooks/useFirestoreDocListener.ts'
import type { Session } from '@shared/types/firestore/session.ts'
import { SessionZ } from '@shared/types/firestore/session.ts'
import { useSettingsStore } from '@src/stores/settingsStore.ts'

export const useSessionFirestore: FirestoreWrapper<Session> = (select?: FirestoreSelector) => {
    const { sessionId } = useSettingsStore()
    return useFirestoreDocListener({
        config: {
            isPublic: true,
            sessionId,
        },
        path: sessionId !== '' ? `/sessions/${sessionId}` : '',
        schema: SessionZ,
        select,
    })
}
