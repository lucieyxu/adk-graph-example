import { PersonGenerationZ } from '@shared/types/general.ts'
import * as z from 'zod'

const VeoStyleReferenceImageZ = z.strictObject({
    referenceType: z.literal('STYLE'),
    image: z.string(),
})

const VeoAssetReferenceImageZ = z.strictObject({
    referenceType: z.literal('ASSET'),
    image: z.string(),
})

const GenerateVideoBaseInputZ = z.strictObject({
    model: z.optional(z.string()),
    numberOfVideos: z.optional(z.union([z.literal(1), z.literal(2)])),
    fps: z.optional(z.literal(24)), // NOT sure why this is an option
    durationSeconds: z.optional(z.literal(5)), // NOT sure why this is an option
    seed: z.optional(z.number()),
    aspectRatio: z.optional(z.union([z.literal('9:16'), z.literal('16:9')])), // Union[Literal["9:16"], Literal["16:9"]] = "16:9"
    resolution: z.optional(z.union([z.literal('720p'), z.literal('1080p')])),
    personGeneration: z.optional(PersonGenerationZ),
    pubsubTopic: z.optional(z.string()),
    negativePrompt: z.optional(z.string()),
    enhancePrompt: z.optional(z.boolean()),
    generateAudio: z.optional(z.boolean()),
    compressionQuality: z.optional(z.union([z.literal('OPTIMIZED'), z.literal('LOSSLESS')])),
})

export const GenerateVideoWithTextZ = GenerateVideoBaseInputZ.extend({
    variant: z.literal('WITH_TEXT'),
    prompt: z.string(), // TODO it is required? but not in prod?
})

export const GenerateVideoWithReferenceImagesZ = GenerateVideoBaseInputZ.extend({
    variant: z.literal('WITH_REFERENCE_IMAGES'),
    prompt: z.optional(z.string()),
    referenceImages: z.union([
        z.array(VeoStyleReferenceImageZ).min(1).max(1),
        z.array(VeoAssetReferenceImageZ).min(1).max(3),
    ]),
})

export const GenerateVideoWithKeyframesInputZ = GenerateVideoBaseInputZ.extend({
    variant: z.literal('WITH_KEYFRAMES'),
    prompt: z.optional(z.string()),
    firstFrame: z.string(),
    lastFrame: z.optional(z.string()),
})

export const GenerateExtendedVideoInputZ = GenerateVideoBaseInputZ.extend({
    variant: z.literal('EXTEND_VIDEO'),
    prompt: z.optional(z.string()),
    video: z.string(),
})

export const GenerateVideoInputZ = z.discriminatedUnion('variant', [
    GenerateVideoWithTextZ,
    GenerateVideoWithReferenceImagesZ,
    GenerateVideoWithKeyframesInputZ,
    GenerateExtendedVideoInputZ,
])

export const GenerateVideoOutputZ = z.strictObject({
    error: z.literal(false),
    operationName: z.string(),
})

export const GetVideoInputZ = z.strictObject({
    operationName: z.string(),
})

export const GetVideoOutputZ = z.strictObject({
    error: z.literal(false),
    operationName: z.string(),
    gcsUri: z.union([z.string(), z.null()]),
})
