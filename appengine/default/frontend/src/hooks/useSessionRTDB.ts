import type { RTDBSelector, RTDBWrapper } from '@shared/ts/hooks/useRTDBListener.ts'
import { useRTDBListener } from '@shared/ts/hooks/useRTDBListener.ts'
import type { SessionRtdb } from '@shared/types/firestore/session.ts'
import { SessionRtdbZ } from '@shared/types/firestore/session.ts'
import { useSessionManagerStore } from '@src/stores/sessionManagerStore.ts'

export const useSessionRTDB: RTDBWrapper<SessionRtdb> = (select?: RTDBSelector) => {
    const session = useSessionManagerStore()
    return useRTDBListener({
        // can omit this 'config' key and object
        config: {
            isPublic: false,
            sessionId: '',
        },
        path: session.id !== '' ? `/sessions/${session.id}` : '',
        schema: SessionRtdbZ,
        select,
    })
}
