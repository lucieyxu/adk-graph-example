import { variableSetsToStrings } from '@shared/ts/lib/cssVars.ts'
import { colors } from './colors.ts'

export const themeRoles = [
    'primary',
    'on-primary',
    'primary-container',
    'on-primary-container',
    'secondary',
    'on-secondary',
    'secondary-container',
    'on-secondary-container',
    'tertiary',
    'on-tertiary',
    'tertiary-container',
    'on-tertiary-container',
    'error',
    'on-error',
    'error-container',
    'on-error-container',
    'background',
    'on-background',
    'surface',
    'on-surface',
    'surface-container-lowest',
    'on-surface-container-lowest',
    'surface-container-low',
    'on-surface-container-low',
    'surface-container',
    'on-surface-container',
    'surface-container-high',
    'on-surface-container-high',
    'surface-container-highest',
    'on-surface-container-highest',
    'on-surface-variant',
    'outline',
    'outline-variant',
] as const

export type ThemeRole = (typeof themeRoles)[number]

export type Theme = Readonly<{
    readonly [Role in ThemeRole]: keyof typeof colors
}>

const _themes = {
    light: {
        primary: 'blue',
        'on-primary': 'white',
        'primary-container': 'blue-50',
        'on-primary-container': 'blue-900',

        secondary: 'green',
        'on-secondary': 'green-50',
        'secondary-container': 'green-100',
        'on-secondary-container': 'green-900',

        tertiary: 'yellow',
        'on-tertiary': 'yellow-50',
        'tertiary-container': 'yellow-100',
        'on-tertiary-container': 'yellow-900',

        error: 'red',
        'on-error': 'white',
        'error-container': 'red-100',
        'on-error-container': 'red-900',

        background: 'gray-50',
        'on-background': 'gray-900',
        surface: 'gray-50',
        'on-surface': 'gray-900',
        'on-surface-variant': 'gray-500',

        'surface-container-lowest': 'gray-300',
        'on-surface-container-lowest': 'gray-900',
        'surface-container-low': 'gray-200',
        'on-surface-container-low': 'gray-800',
        'surface-container': 'gray-100',
        'on-surface-container': 'gray-700',
        'surface-container-high': 'gray-50',
        'on-surface-container-high': 'gray-600',
        'surface-container-highest': 'white',
        'on-surface-container-highest': 'gray-500',

        outline: 'gray-600',
        'outline-variant': 'gray-300',
    } as const satisfies Theme,
    dark: {
        primary: 'blue',
        'on-primary': 'blue-50',
        'primary-container': 'blue-100',
        'on-primary-container': 'blue-800',

        secondary: 'green',
        'on-secondary': 'green-50',
        'secondary-container': 'green-100',
        'on-secondary-container': 'green-800',

        tertiary: 'orange',
        'on-tertiary': 'orange-50',
        'tertiary-container': 'orange-100',
        'on-tertiary-container': 'orange-800',

        error: 'red',
        'on-error': 'red-900',
        'error-container': 'red-100',
        'on-error-container': 'red-800',

        background: 'gray-900',
        'on-background': 'gray-100',
        surface: 'gray-900',
        'on-surface': 'gray-100',
        'on-surface-variant': 'gray-200',

        'surface-container-lowest': 'black',
        'on-surface-container-lowest': 'gray-500',
        'surface-container-low': 'gray-900',
        'on-surface-container-low': 'gray-400',
        'surface-container': 'gray-800',
        'on-surface-container': 'gray-300',
        'surface-container-high': 'gray-700',
        'on-surface-container-high': 'gray-200',
        'surface-container-highest': 'gray-600',
        'on-surface-container-highest': 'gray-100',

        outline: 'gray-300',
        'outline-variant': 'gray-200',
    } as const satisfies Theme,
    // Add other themes as necessary
} as const

export const DEFAULT_THEME = 'dark' as const satisfies keyof typeof _themes
const defaultTheme = _themes[DEFAULT_THEME]

if (!defaultTheme) {
    throw new Error(`Default theme ${DEFAULT_THEME} not found`)
}

/**
 * `themesRaw` is a strongly typed collection of color themes that can be used to style the application.
 * `themesRaw` is a subset of `themes` in that it does not include the `-rgb` variants of the colors.
 * `themesRaw.default` is is a duplicate of the theme referenced by `DEFAULT_THEME`.
 *
 * @example
 * ```ts
 * themes.default.background
 * themes.default['background-rgb']
 * themes.dark.primary
 * themes.dark['primary-rgb']
 * ```
 */
export const themesRaw = { ..._themes, default: defaultTheme } as const

type ThemesRaw = typeof themesRaw

export type ThemeName = keyof ThemesRaw
export const themeNames = Object.keys(themesRaw) as ThemeName[]

type ThemeMap = {
    readonly [Theme in ThemeName]: Theme extends ThemeName
        ? {
              readonly [Role in ThemeRole as `${Role}-rgb`]: Role extends keyof ThemesRaw[Theme]
                  ? `${ThemesRaw[Theme][Role]}-rgb`
                  : never
          } & {
              readonly [Role in ThemeRole]: Role extends keyof ThemesRaw[Theme]
                  ? ThemesRaw[Theme][Role]
                  : never
          }
        : never
}

/**
 * `themes` is a strongly typed collection of color themes that can be used to style the application.
 * `themes.default` is is a duplicate of the theme referenced by `DEFAULT_THEME`.
 *
 * @example
 * ```ts
 * themes.default.background
 * themes.default['background-rgb']
 * themes.dark.primary
 * themes.dark['primary-rgb']
 * ```
 */
export const themes = Object.fromEntries(
    Object.entries(themesRaw).map(([themeName, value]) => [
        themeName,
        Object.fromEntries(
            Object.entries(value).flatMap(([role, color]) => [
                [`${role}-rgb`, `${color}-rgb`] as const,
                [`${role}`, color] as const,
            ]),
        ),
    ]),
) as ThemeMap

const buildMaterialThemeStyle = (theme: Theme) =>
    variableSetsToStrings([
        {
            set: theme,
            transform: (key, value) => [
                `md-sys-color-${key}`,
                colors[value as keyof typeof colors],
            ],
        },
    ]).join('')

/**
 * global styles string to enable injecting theme css variables into the document. This works in client or server components.
 * Also provides global classes for changing the theme for sub-trees of the document.
 *
 * @example
 * ```ts
 * <style dangerouslySetInnerHTML={{ __html: themesStyles }} />
 *
 * <div [data-theme='light']> // this element and all children will be styled with the light theme
 * // or
 * <div [data-theme='dark']> // this element and all children will be styled with the dark theme
 * ```
 */
export const themesStyles = `
    html { ${buildMaterialThemeStyle(themes.default)} }
    ${themeNames.map((theme) => `[data-theme='${theme}'] {${buildMaterialThemeStyle(themes[theme])} }`).join('\n')}
`
