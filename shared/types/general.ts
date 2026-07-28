import { Timestamp } from 'firebase/firestore'
import * as z from 'zod'

//
// - - - Top-level Input and Output
//

export const ApiErrorZ = z.strictObject({
    error: z.literal(true),
    message: z.string(),
    input: z.unknown(),
})
export type ApiError = z.infer<typeof ApiErrorZ>

//
// - - - Gemini / Imagen / Veo shared types
//

export const ModelRecordZ = z.strictObject({
    ga: z.boolean(),
    name: z.string(),
    version: z.number(),
})

export const ModelCategoryZ = z.union([
    z.literal('gemini_pro'),
    z.literal('gemini_flash'),
    z.literal('gemini_lite'),
    z.literal('gemini_pro_image'),
    z.literal('gemini_flash_image'),
    z.literal('imagen'),
    z.literal('imagen_fast'),
    z.literal('veo'),
    z.literal('veo_fast'),
    z.literal('lyria'),
])
export type ModelCategory = z.infer<typeof ModelCategoryZ>

export const ModelsInfo = z.record(ModelCategoryZ, z.array(ModelRecordZ))

export const FirestoreTimestampZ = z.instanceof(Timestamp)

export const GenApiDescriptionZ = z.strictObject({
    url: z.string(),
    prompt: z.string(),
    preferredModel: z.string(),
    compatibleModelCategories: z.array(ModelCategoryZ),
    promptSubstitutions: z.array(z.array(z.string()).length(2).min(2).max(2)).default([]),
})

export const ListGenApisOutputZ = z.strictObject({
    error: z.literal(false),
    genApis: z.array(GenApiDescriptionZ).default([]),
    models: ModelsInfo,
})

export type ListGenApisOutput = z.infer<typeof ListGenApisOutputZ>

export const GenApiBaseInputZ = z.strictObject({
    sessionId: z.string(),
    eventId: z.string(),
    modelOverride: z.optional(z.string()),
    promptOverride: z.optional(z.string()),
    values: z.optional(z.object()).default({}),
})

export const GenApiBaseOutputZ = z.strictObject({
    error: z.literal(false),
    meta: z.strictObject({
        responseTime: z.number(),
        model: z.string(),
    }),
})

export const ThinkingConfigZ = z.strictObject({
    includeThoughts: z.boolean(),
    thinkingBudget: z.number(),
})

export const MediaZ = z.strictObject({
    name: z.optional(z.string()),
    file: z.string(), // gcs uri or base64 inline data
})

export const GeneratedImageZ = z.strictObject({
    gcsUri: z.optional(z.union([z.null(), z.string()])),
    base64: z.optional(z.union([z.null(), z.string()])),
})

export const GeminiConfigBaseZ = z.strictObject({
    model: z.optional(z.string()),
    language: z.optional(z.string()),
    prompt: z.string(),
    systemInstruction: z.optional(z.string()),
    temperature: z.optional(z.number()),
    topP: z.optional(z.number()),
    topK: z.optional(z.number()),
    candidateCount: z.optional(z.number()),
    maxOutputTokens: z.optional(z.number()),
    stopSequences: z.optional(z.array(z.string())),
    presencePenalty: z.optional(z.number()),
    frequencyPenalty: z.optional(z.number()),
    seed: z.optional(z.number()),
    thinkingConfig: z.optional(ThinkingConfigZ),
})

export const SafetyFilterLevelZ = z.union([
    z.literal('BLOCK_LOW_AND_ABOVE'),
    z.literal('BLOCK_MEDIUM_AND_ABOVE'),
    z.literal('BLOCK_ONLY_HIGH'),
    // z.literal('BLOCK_NONE'), // alowlisted only
])
export type SafetyFilterLevel = z.infer<typeof SafetyFilterLevelZ>

export const PersonGenerationZ = z.union([
    z.literal('DONT_ALLOW'),
    z.literal('ALLOW_ADULT'),
    // z.literal('ALLOW_ALL'), // alowlisted only
])
export type PersonGeneration = z.infer<typeof PersonGenerationZ>

export const JobsRunInputZ = z.strictObject({
    firestoreQuery: z.string(),
    retries: z.optional(z.number()),
})

export const JobsRunOutputZ = z.strictObject({
    error: z.literal(false),
    executionName: z.string(),
    input: JobsRunInputZ,
})
export type JobsRunOutput = z.infer<typeof JobsRunOutputZ>

export const JobsGetOutputZ = z.strictObject({
    error: z.literal(false),
    executionName: z.string(),
    status: z.union([
        z.literal('queued'),
        z.literal('running'),
        z.literal('success'),
        z.literal('error'),
    ]),
})
export type JobsGetOutputZ = z.infer<typeof JobsGetOutputZ>

export const JobsCancelOutputZ = z.strictObject({
    error: z.literal(false),
    executionName: z.string(),
})
export type JobsCancelOutputZ = z.infer<typeof JobsCancelOutputZ>
