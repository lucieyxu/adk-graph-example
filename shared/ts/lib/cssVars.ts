import { mergeToClone } from '@shared/ts/lib/mergeToClone.ts'
import type { CSSProperties } from 'react'

type KeyValueTransform = (key: string, value: string | number) => [string, string | number]

/**
 * This function generates CSS variables from a record of colors.
 * @param colors - A record of colors.
 * @param prefix - An optional prefix to add to the CSS variables.
 * @returns A record of CSS variables.
 *
 * @example
 * ```ts
 * const colors = { margin: '1rem', padding: '2rem' }
 * console.log(generateCssVariables(colors))
 * // => { '--margin': '1rem', '--padding': '2rem' }
 * ```
 * @example
 * ```ts
 * const colors = { black: '#000000', white: '#FFFFFF' }
 * console.log(generateCssVariables(colors, 'color'))
 * // => { '--color-black': '#000000', '--color-white': '#FFFFFF' }
 * ```
 */
export const generateCssVariables = (
    set: Record<string, string | number>,
    transform?: KeyValueTransform,
) =>
    Object.fromEntries(
        Object.entries(set).map(([key, value]) => {
            const [outKey, outValue] = transform ? transform(key, value) : [key, value]
            return [`--${outKey}` as const, outValue]
        }),
    )

export const generateSassVariables = (
    colors: Record<string, string | number>,
    transform?: KeyValueTransform,
) =>
    Object.fromEntries(
        Object.entries(colors).map(([key, value]) => {
            const [outKey, outValue] = transform ? transform(key, value) : [key, value]
            return [`$${outKey}` as const, outValue]
        }),
    )

export const variableSetToStrings = (
    variableSet: Record<string, string | number>,
    transform?: KeyValueTransform,
) =>
    Object.entries(variableSet).map(([key, value]) => {
        const [outKey, outValue] = transform ? transform(key, value) : [key, value]
        return `--${outKey}: ${outValue};` as const
    })

export const variableSetsToStrings = (variableSets: VariableSetWithOptionalTransform[]) =>
    variableSets.flatMap((variableSet) => {
        const { set, transform } =
            'transform' in variableSet
                ? (variableSet as VariableSetWithTransform)
                : { set: variableSet }
        return variableSetToStrings(set, transform)
    })

export interface VariableSetWithTransform {
    set: Record<string, string | number>
    transform: (key: string, value: string | number) => [string, string | number]
}

export type VariableSetWithOptionalTransform =
    | VariableSetWithTransform['set']
    | VariableSetWithTransform

export const prepareCssVariableSet = (variableSet: VariableSetWithOptionalTransform) => {
    const { set, transform } =
        'transform' in variableSet
            ? (variableSet as VariableSetWithTransform)
            : { set: variableSet }
    return generateCssVariables(set, transform)
}

export const mergeCssVariableSets = (variableSets: VariableSetWithOptionalTransform[]) => {
    const allVariables = variableSets.reduce((acc, curr) => {
        const merged = mergeToClone(acc, prepareCssVariableSet(curr))
        return merged
    }, {}) as Record<string, string | number>
    return allVariables
}

export const getCssVariablesCSSObject = (
    variableSets: VariableSetWithOptionalTransform[],
): CSSProperties => mergeCssVariableSets(variableSets) as CSSProperties
