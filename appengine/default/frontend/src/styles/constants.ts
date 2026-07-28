import { variableSetsToStrings } from '@shared/ts/lib/cssVars.ts'

const longSide = 3840
const shortSide = 2160

const orientationNames = ['landscape', 'portrait'] as const
export type OrientationName = (typeof orientationNames)[number]

interface Orientation {
    width: number
    height: number
}

export const viewport = {
    landscape: { width: longSide, height: shortSide },
    portrait: { width: shortSide, height: longSide },
} as const satisfies Record<OrientationName, Orientation>

export const grid = {
    margin: '48rem',
    gutter: '16rem',
    columns: 12,
} as const

const gridStyleString = variableSetsToStrings([
    { set: grid, transform: (key, value) => [`grid-${key}`, value] as const },
]).join('')

/**
 * global styles string to enable injecting grid css variables into the document. This works in client or server components.
 *
 * @example
 * ```ts
 * <style dangerouslySetInnerHTML={{ __html: gridStyles }} />
 * ```
 */
export const gridStyles = `html { ${gridStyleString} }`
