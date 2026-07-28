import * as z from 'zod'

export const HelloInputZ = z.strictObject({
    name: z.string(),
})

export const HelloOutputZ = z.strictObject({
    error: z.literal(false),
    which: z.literal('py'),
    hello: z.string(),
})
