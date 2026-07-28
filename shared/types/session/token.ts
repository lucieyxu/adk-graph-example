import * as z from 'zod'

export const SessionTokenInputZ = z.strictObject({
    uid: z.optional(z.string()),
})

export const SessionTokenOutputZ = z.strictObject({
    error: z.literal(false),
    token: z.string(),
})

export const SessionPublicTokenInputZ = z.strictObject({
    uid: z.string(),
})

export const SessionPublicTokenOutputZ = z.strictObject({
    error: z.literal(false),
    token: z.string(),
})
