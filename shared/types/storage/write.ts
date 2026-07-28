import * as z from 'zod'

export const StorageWriteOutputZ = z.strictObject({
    error: z.literal(false),
    gcsUri: z.string(),
    contentType: z.string(),
    size: z.number(),
})

export const StorageRequestWriteUrlInputZ = z.strictObject({
    gcsUri: z.string(),
    contentType: z.string(),
})

export const StorageRequestWriteUrlOutputZ = z.strictObject({
    error: z.literal(false),
    gcsUri: z.string(),
    contentType: z.string(),
    signedUrl: z.string(),
})
export type StorageRequestWriteUrlOutput = z.infer<typeof StorageRequestWriteUrlOutputZ>
