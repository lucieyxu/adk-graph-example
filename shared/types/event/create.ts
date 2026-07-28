import * as z from 'zod'

export const EventCreateInputZ = z.strictObject({
    id: z.string().regex(/^[a-zA-Z0-9-]+$/),
})

export const EventCreateOutputZ = z.strictObject({
    error: z.literal(false),
    id: z.string().regex(/^[a-zA-Z0-9-]+$/),
})
