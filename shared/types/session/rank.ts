import * as z from 'zod'

export const SessionRankInputZ = z.strictObject({
    sessionId: z.string(),
})

export const SessionRankOutputZ = z.strictObject({
    error: z.literal(false),
    rank: z.number(),
    total: z.number(),
})
export type SessionRankOutput = z.infer<typeof SessionRankOutputZ>
