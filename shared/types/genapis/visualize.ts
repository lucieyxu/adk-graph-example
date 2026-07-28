import { GenApiBaseInputZ, GenApiBaseOutputZ } from '@shared/types/general.ts'
import { GenerateImageOutputZ } from '@shared/types/generate/image.ts'
import * as z from 'zod'

export const VisualizeValuesInputZ = z.strictObject({
    imageStyle: z.string(),
    characterName: z.string(),
    characterType: z.string(),
    eventType: z.string(),
    items: z.string(),
})

export const VisualizeInputZ = GenApiBaseInputZ.extend({
    values: VisualizeValuesInputZ,
    edit: z.optional(
        z.strictObject({
            imageInput: z.string(),
            prompt: z.string(),
        }),
    ),
})

export const VisualizeOutputZ = GenApiBaseOutputZ.extend(GenerateImageOutputZ.shape)
export type VisualizeOutput = z.infer<typeof VisualizeOutputZ>
