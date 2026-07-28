import { FirestoreTimestampZ } from '@shared/types/general.ts'
import * as z from 'zod'

export const SessionZ = z.strictObject({
    id: z.string(),
    name: z.string(),
    eventId: z.string(),

    createdAt: FirestoreTimestampZ,
    startedAt: z.union([z.null(), FirestoreTimestampZ]),
    completedAt: z.union([z.null(), FirestoreTimestampZ]),
    expiresAt: FirestoreTimestampZ,

    score: z.number(),

    images: z.array(z.string()).default([]),
})
export type Session = z.infer<typeof SessionZ>

export const SessionRtdbZ = z.strictObject({
    id: z.string(),
    score: z.number(),
})
export type SessionRtdb = z.infer<typeof SessionRtdbZ>
