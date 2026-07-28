import { FirestoreTimestampZ } from '@shared/types/general.ts'
import * as z from 'zod'

export const EventZ = z.strictObject({
    id: z.string(),

    createdAt: FirestoreTimestampZ,
    expiresAt: FirestoreTimestampZ,
})
export type Event = z.infer<typeof EventZ>
