import type { input, output, infer as ZodInfer, ZodType } from 'zod'
import * as z from 'zod'

const KeyZ = z.templateLiteral(['key-', z.number()])
type Key = z.infer<typeof KeyZ>

export const CreateRTDBArrayZ = <Z extends ZodType, T extends ZodInfer<Z>>(itemSchema: Z) => {
    return z.codec(
        z.union([z.record(KeyZ, itemSchema), z.array(itemSchema), z.undefined()]),
        z.array(itemSchema),
        {
            decode: (record: Record<Key, output<Z>> | Array<output<Z>> | undefined) => {
                if (record === undefined) return []
                if (Array.isArray(record)) {
                    return record.map((val) => val as input<Z>)
                }
                const keys = Object.keys(record).sort((a, b) =>
                    a.localeCompare(b, undefined, { numeric: true }),
                )
                const vals = keys.map((key) => record[key as Key] as input<Z>)
                return vals
            },
            encode: (array) => {
                if (array.length === 0) return {}
                const record: Record<Key, T> = {}
                array.forEach((val, i) => {
                    record[`key-${i}`] = val as T
                })
                return record
            },
        },
    )
}
