import { variableSetsToStrings } from '@shared/ts/lib/cssVars.ts'

export const DEFAULT_COLOR_SHADE = 500

// Colors are defined using rgb syntax so that VS Code's color picker appears.
const palettes = {
    black: {
        500: 'rgb(0, 0, 0)', // default
    },
    white: {
        500: 'rgb(255, 255, 255)', // default
    },
    gray: {
        900: 'rgb(32, 33, 36)',
        850: 'rgb(44, 46, 50)',
        800: 'rgb(60, 64, 67)',
        700: 'rgb(95, 98, 104)',
        600: 'rgb(128, 134, 139)',
        500: 'rgb(154, 160, 166)', // default
        400: 'rgb(189, 193, 198)',
        300: 'rgb(218, 220, 224)',
        200: 'rgb(232, 234, 237)',
        100: 'rgb(241, 243, 244)',
        50: 'rgb(248, 249, 250)',
    },
    blue: {
        900: 'rgb(23, 78, 166)',
        800: 'rgb(24, 90, 188)',
        700: 'rgb(25, 103, 210)',
        600: 'rgb(26, 115, 232)',
        500: 'rgb(66, 133, 244)', // default
        400: 'rgb(102, 157, 246)',
        300: 'rgb(138, 180, 248)',
        200: 'rgb(174, 203, 250)',
        100: 'rgb(210, 227, 252)',
        50: 'rgb(232, 240, 254)',
    },
    cyan: {
        900: 'rgb(0, 113, 119)',
        800: 'rgb(0, 149, 164)',
        700: 'rgb(0, 169, 189)',
        600: 'rgb(0, 191, 217)',
        500: 'rgb(0, 208, 237)', // default
        400: 'rgb(0, 216, 240)',
        300: 'rgb(66, 223, 244)',
        200: 'rgb(127, 233, 248)',
        100: 'rgb(179, 242, 250)',
        50: 'rgb(225, 250, 253)',
    },
    red: {
        900: 'rgb(165, 14, 14)',
        800: 'rgb(179, 20, 18)',
        700: 'rgb(197, 34, 31)',
        600: 'rgb(217, 48, 37)',
        500: 'rgb(234, 67, 53)', // default
        400: 'rgb(238, 103, 92)',
        300: 'rgb(242, 139, 130)',
        200: 'rgb(246, 174, 169)',
        100: 'rgb(250, 210, 207)',
        50: 'rgb(252, 232, 230)',
    },
    yellow: {
        900: 'rgb(227, 116, 0)',
        800: 'rgb(234, 134, 0)',
        700: 'rgb(242, 153, 0)',
        600: 'rgb(249, 171, 0)',
        500: 'rgb(251, 188, 4)', // default
        400: 'rgb(252, 201, 52)',
        300: 'rgb(253, 214, 99)',
        200: 'rgb(253, 226, 147)',
        100: 'rgb(254, 239, 195)',
        50: 'rgb(254, 247, 224)',
    },
    orange: {
        900: 'rgb(179, 71, 0)',
        800: 'rgb(193, 86, 0)',
        700: 'rgb(209, 102, 0)',
        600: 'rgb(224, 118, 0)',
        500: 'rgb(242, 133, 26)', // default
        400: 'rgb(248, 156, 58)',
        300: 'rgb(251, 176, 92)',
        200: 'rgb(253, 200, 138)',
        100: 'rgb(255, 224, 184)',
        50: 'rgb(255, 243, 229)',
    },
    green: {
        900: 'rgb(13, 101, 45)',
        800: 'rgb(19, 115, 51)',
        700: 'rgb(24, 128, 56)',
        600: 'rgb(30, 142, 62)',
        500: 'rgb(52, 168, 83)', // default
        400: 'rgb(91, 185, 116)',
        300: 'rgb(129, 201, 149)',
        200: 'rgb(168, 218, 181)',
        100: 'rgb(206, 234, 214)',
        50: 'rgb(230, 244, 234)',
    },
    purple: {
        900: 'rgb(53, 35, 145)',
        800: 'rgb(71, 46, 160)',
        700: 'rgb(83, 52, 168)',
        600: 'rgb(96, 60, 177)',
        500: 'rgb(105, 65, 183)', // default
        400: 'rgb(127, 93, 194)',
        300: 'rgb(150, 122, 205)',
        200: 'rgb(180, 160, 219)',
        100: 'rgb(209, 198, 233)',
        50: 'rgb(237, 232, 246)',
    },
    pink: {
        900: 'rgb(97, 27, 100)',
        800: 'rgb(124, 35, 116)',
        700: 'rgb(140, 40, 124)',
        600: 'rgb(156, 47, 132)',
        500: 'rgb(168, 52, 137)', // default
        400: 'rgb(183, 78, 153)',
        300: 'rgb(197, 109, 170)',
        200: 'rgb(215, 150, 194)',
        100: 'rgb(231, 191, 218)',
        50: 'rgb(245, 230, 240)',
    },

    // Add more colors as necessary, example:
    // "some-custom-color": {
    //     500: "rgb([r], [g], [b])", // default
    // }
} as const

type Palettes = typeof palettes
export type ColorName = keyof Palettes
export const colorNames = Object.keys(palettes) as ColorName[]

type ColorShades = {
    readonly [Color in ColorName]: {
        readonly [Level in keyof Palettes[Color]]: Level extends number
            ? { color: Color; level: Level }
            : never
    }[keyof Palettes[Color]]
}[ColorName]

type ColorShadeMap = {
    readonly [Shade in ColorShades as `${Shade['color']}-${Shade['level']}`]: Shade['color'] extends ColorName
        ? Shade['level'] extends keyof Palettes[Shade['color']]
            ? Palettes[Shade['color']][Shade['level']]
            : never
        : never
}

type ColorShadeRGBMap = {
    readonly [Shade in ColorShades as `${Shade['color']}-${Shade['level']}-rgb`]: Shade['color'] extends ColorName
        ? Shade['level'] extends keyof Palettes[Shade['color']]
            ? Palettes[Shade['color']][Shade['level']] extends `rgb(${infer R}, ${infer G}, ${infer B})`
                ? `${R} ${G} ${B}`
                : never
            : never
        : never
}

type DefaultColorMap = {
    readonly [K in ColorShades as K['color']]: (typeof palettes)[K['color']][typeof DEFAULT_COLOR_SHADE]
}

type DefaultColorRGBMap = {
    readonly [K in ColorShades as `${K['color']}-rgb`]: (typeof palettes)[K['color']][typeof DEFAULT_COLOR_SHADE] extends `rgb(${infer R}, ${infer G}, ${infer B})`
        ? `${R} ${G} ${B}`
        : never
}

const colorShades = Object.fromEntries(
    Object.entries(palettes).flatMap(([key, value]) =>
        Object.entries(value).map(([shade, color]) => [`${key}-${shade}`, color] as const),
    ),
) as ColorShadeMap

const colorShadeRGBs = Object.fromEntries(
    Object.entries(palettes).flatMap(([key, value]) =>
        Object.entries(value).map(
            ([shade, color]) =>
                [
                    `${key}-${shade}-rgb`,
                    color.replace('rgb(', '').replace(')', '').split(',').join(''),
                ] as const,
        ),
    ),
) as ColorShadeRGBMap

const colorDefaults = Object.fromEntries(
    Object.entries(palettes).map(([key, value]) => [key, value[DEFAULT_COLOR_SHADE]]),
) as DefaultColorMap

const rgbDefaults = Object.fromEntries(
    Object.entries(palettes).map(([key]) => [
        `${key}-rgb`,
        colorShadeRGBs[`${key}-${DEFAULT_COLOR_SHADE}-rgb` as keyof ColorShadeRGBMap],
    ]),
) as DefaultColorRGBMap

/**
 * `colorsRaw` is a strongly typed collection of all the colors in the palette, along with helpful aliases for default shades of each palette color.
 *
 * See {@link palettes} for the source of truth for the color palette.
 */
export const colorsRaw = { ...colorDefaults, ...colorShades } as const

/**
 * `colorRGBs` is a strongly typed collection of all the RGB values for each color in the palette.
 *
 * See {@link palettes} for the source of truth for the color palette.
 */
export const colorRGBs = { ...colorShadeRGBs, ...rgbDefaults } as const

/**
 * `colors` is a strongly typed collection of all the colors in the palette.
 * It includes:
 *  - helpful aliases for default shades of each palette color (e.g. `colors.['blue-500']` has an alias of `colors.blue`).
 *  - the RGB values for each color (e.g. `colors.['blue-500-rgb']` is `66 133 244`, which can be used in CSS as `rgb(${colors.['blue-500-rgb']} / 50%)`).
 *
 * See {@link palettes} for the source of truth for the color palette.
 */
export const colors = { ...colorsRaw, ...colorRGBs } as const

/**
 * global styles string to enable injecting color palette css variables into the document. This works in client or server components.
 *
 * @example
 * ```ts
 * <style dangerouslySetInnerHTML={{ __html: colorStyles }} />
 * ```
 */
export const colorStyles = `html { ${variableSetsToStrings([colors]).join('')} }`
