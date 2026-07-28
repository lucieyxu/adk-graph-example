import * as z from 'zod'

export const StorageRequestReadUrlInputZ = z.strictObject({
    gcsUri: z.string(),
})

export const StorageRequestReadUrlOutputZ = z.strictObject({
    gcsUri: z.string(),
    contentType: z.string(),
    size: z.number(),
    signedUrl: z.number(),
})
export type StorageRequestReadUrlOutput = z.infer<typeof StorageRequestReadUrlOutputZ>
