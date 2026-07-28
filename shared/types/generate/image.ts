import {
    GeminiConfigBaseZ,
    GeneratedImageZ,
    MediaZ,
    PersonGenerationZ,
    SafetyFilterLevelZ,
} from '@shared/types/general.ts'
import * as z from 'zod'

export const ImageResolutionZ = z.union([z.literal('1k'), z.literal('2k')])

export const ImageEditModeZ = z.union([
    z.literal('EDIT_MODE_DEFAULT'),
    z.literal('EDIT_MODE_INPAINT_REMOVAL'),
    z.literal('EDIT_MODE_INPAINT_INSERTION'),
    z.literal('EDIT_MODE_OUTPAINT'),
    z.literal('EDIT_MODE_CONTROLLED_EDITING'),
    z.literal('EDIT_MODE_STYLE'),
    z.literal('EDIT_MODE_BGSWAP'),
    z.literal('EDIT_MODE_PRODUCT_IMAGE'),
])

export const LanguageZ = z.union([
    z.literal('en'),
    z.literal('ja'),
    z.literal('ko'),
    z.literal('hi'),
    z.literal('zh'),
    z.literal('pt'),
    z.literal('es'),
])

export const AspectRatioZ = z.union([
    z.literal('1:1'),
    z.literal('3:4'),
    z.literal('4:3'),
    z.literal('9:16'),
    z.literal('16:9'),
])

const GenerateImageBaseInput = z.strictObject({
    model: z.optional(z.string()),
    prompt: z.optional(z.string()),
    outputGcsUri: z.optional(z.string()),
    language: z.optional(LanguageZ),
    numberOfImages: z.optional(z.number()),
    outputMimeType: z.optional(z.union([z.literal('image/jpg'), z.literal('image/png')])),
    safetyFilterLevel: z.optional(SafetyFilterLevelZ),
    personGeneration: z.optional(PersonGenerationZ),
    negativePrompt: z.optional(z.string()),
    seed: z.optional(z.number()),
    guidanceScale: z.optional(z.number()),
    outputCompressionQuality: z.optional(z.number()),
})

export const GenerateNewImageInputZ = GenerateImageBaseInput.extend({
    variant: z.literal('NEW'),
    enhancePrompt: z.optional(z.boolean()),
    aspectRatio: z.optional(AspectRatioZ),
})

export const GenerateEditedImageInputZ = GenerateImageBaseInput.extend({
    variant: z.literal('EDIT'),
    inputImage: z.string(),
    editMode: z.optional(ImageEditModeZ),
    baseSteps: z.optional(z.number()),
    aspectRatio: z.optional(AspectRatioZ),
})

export const GenerateImageInputZ = z.discriminatedUnion('variant', [
    GenerateNewImageInputZ,
    GenerateEditedImageInputZ,
])

export const GenerateImageOutputZ = z.strictObject({
    error: z.literal(false),
    images: z.array(GeneratedImageZ),
})

export const GenerateGeminiImageSimpleInputZ = GeminiConfigBaseZ.extend({
    variant: z.literal('SIMPLE'),
    outputMimeType: z.optional(z.union([z.literal('image/jpg'), z.literal('image/png')])),
    outputGcsUri: z.string(),
    aspectRatio: z.optional(AspectRatioZ),
})

export const GenerateGeminiImageWithMediaInputZ = GeminiConfigBaseZ.extend({
    variant: z.literal('WITH_MEDIA'),
    outputMimeType: z.optional(z.union([z.literal('image/jpg'), z.literal('image/png')])),
    media: z.array(MediaZ),
    outputGcsUri: z.string(),
    aspectRatio: z.optional(AspectRatioZ),
})

export const GenerateGeminiImageInputZ = z.discriminatedUnion('variant', [
    GenerateGeminiImageSimpleInputZ,
    GenerateGeminiImageWithMediaInputZ,
])
