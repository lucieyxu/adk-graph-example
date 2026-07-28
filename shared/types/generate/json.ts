import { GeminiConfigBaseZ, MediaZ } from '@shared/types/general.ts'
import * as z from 'zod'

export const GenerateJsonSimpleSerializedInputZ = GeminiConfigBaseZ.extend({
    variant: z.literal('SIMPLE'),
    responseJsonSchema: z.ZodObject,
    // responseMimeType -- not configurable on frontend
    // responseModalities -- not configurable on frontend
})

export const GenerateJsonWithMediaSerializedInputZ = GeminiConfigBaseZ.extend({
    variant: z.literal('WITH_MEDIA'),
    media: z.array(MediaZ),
    responseJsonSchema: z.ZodObject,
})

export const GenerateJsonInputZ = z.discriminatedUnion('variant', [
    GenerateJsonSimpleSerializedInputZ,
    GenerateJsonWithMediaSerializedInputZ,
])

export const GenerateJsonOutputZ = z.strictObject({
    error: z.literal(false),
    data: z.unknown(),
})
