import { GeminiConfigBaseZ, MediaZ } from '@shared/types/general.ts'
import * as z from 'zod'

export const GenerateTextSimpleInputZ = GeminiConfigBaseZ.extend({
    variant: z.literal('SIMPLE'),
    // responseMimeType -- not configurable on frontend
    // responseModalities -- not configurable on frontend
})

export const GenerateTextWithMediaInputZ = GeminiConfigBaseZ.extend({
    variant: z.literal('WITH_MEDIA'),
    media: z.array(MediaZ),
    // responseMimeType -- not configurable on frontend
    // responseModalities -- not configurable on frontend
})

export const GenerateTextInputZ = z.discriminatedUnion('variant', [
    GenerateTextSimpleInputZ,
    GenerateTextWithMediaInputZ,
])

export const GenerateTextOutputZ = z.strictObject({
    error: z.literal(false),
    text: z.string(),
})
export type GenerateTextOutput = z.infer<typeof GenerateTextOutputZ>
