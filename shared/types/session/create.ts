import * as z from 'zod'

export const SessionCreateInputZ = z.strictObject({
    name: z.string(),
    eventId: z.string(),
})

export const SessionCreateOutputZ = z.strictObject({
    error: z.literal(false),
    id: z.string(),
})
