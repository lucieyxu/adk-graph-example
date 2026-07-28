import { GenApiBaseInputZ, GenApiBaseOutputZ } from '@shared/types/general.ts'
import * as z from 'zod'

export const ShoppingValuesInputZ = z.strictObject({
    characterName: z.string(),
    characterType: z.string(),
    eventType: z.string(),
    spendingLimit: z.number(),
    minItems: z.number(),
    maxItems: z.number(),
})

export const ShoppingInputZ = GenApiBaseInputZ.extend({
    values: ShoppingValuesInputZ,
})

export const ShoppingItemZ = z.strictObject({
    itemName: z.string(),
    totalPrice: z.number(),
    quantity: z.number(),
})

export const ShoppingOutputZ = GenApiBaseOutputZ.extend({
    summary: z.string(),
    totalPrice: z.number(),
    list: z.array(ShoppingItemZ),
})
export type ShoppingOutput = z.infer<typeof ShoppingOutputZ>
