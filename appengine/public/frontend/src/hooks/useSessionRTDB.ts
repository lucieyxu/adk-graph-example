import type { RTDBSelector, RTDBWrapper } from '@shared/ts/hooks/useRTDBListener.ts'
import { useRTDBListener } from '@shared/ts/hooks/useRTDBListener.ts'
import type { SessionRtdb } from '@shared/types/firestore/session.ts'
import { SessionRtdbZ } from '@shared/types/firestore/session.ts'
import { useSettingsStore } from '@src/stores/settingsStore.ts'

export const useSessionRTDB: RTDBWrapper<SessionRtdb> = (select?: RTDBSelector) => {
    const { sessionId } = useSettingsStore()
    return useRTDBListener({
        config: {
            isPublic: true,
            sessionId,
        },
        path: sessionId !== '' ? `/sessions/${sessionId}` : '',
        schema: SessionRtdbZ,
        select,
    })
}
