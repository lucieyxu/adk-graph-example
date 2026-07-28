import { type ColorName, colorNames, colors } from '@shared/ts/colors/index.ts'
import type { ValuesOf } from '@shared/types/util.ts'
import { hasBadContrast } from 'color2k'
import type { ButtonProps } from './Button.tsx'

type ButtonColor = {
    background: string
    foreground: string
    backgroundActive: string
    border: string
    rgb: string
    focus: string
}

type ButtonVariantColors = {
    [Variant in NonNullable<Exclude<ButtonProps['variant'], 'text'>>]: ButtonColor
}

type ButtonColors = {
    [Color in ColorName]: ButtonVariantColors
}

const colorsWithoutBlackAndWhite = colorNames.filter(
    (color) => color !== 'black' && color !== 'white',
)

type ColorsWithoutBlackAndWhite = ValuesOf<typeof colorsWithoutBlackAndWhite>

const BLACK_ACTIVE_SHADE = 800
const WHITE_ACTIVE_SHADE = 300
const COLOR_ACTIVE_SHADE = 600
const FOCUS_OPACITY = 50
const SECONDARY_ACTIVE_OPACITY = 25

export const buttonColors: ButtonColors = {
    black: {
        primary: {
            background: 'var(--black)',
            foreground: 'var(--white)',
            backgroundActive: `var(--gray-${BLACK_ACTIVE_SHADE})`,
            border: 'transparent',
            rgb: 'var(--black-rgb)',
            focus: `rgba(var(--black-rgb) / ${FOCUS_OPACITY}%)`,
        },
        secondary: {
            background: 'transparent',
            foreground: 'var(--black)',
            backgroundActive: `rgb(var(--black-rgb) / ${SECONDARY_ACTIVE_OPACITY}%)`,
            border: 'var(--black)',
            rgb: 'var(--black-rgb)',
            focus: `rgba(var(--black-rgb) / ${FOCUS_OPACITY}%)`,
        },
    },
    white: {
        primary: {
            background: 'var(--white)',
            foreground: 'var(--black)',
            backgroundActive: `var(--gray-${WHITE_ACTIVE_SHADE})`,
            border: 'transparent',
            rgb: 'var(--white-rgb)',
            focus: `rgba(var(--white-rgb) / ${FOCUS_OPACITY}%)`,
        },
        secondary: {
            background: 'transparent',
            foreground: 'var(--white)',
            backgroundActive: `rgb(var(--white-rgb) / ${SECONDARY_ACTIVE_OPACITY}%)`,
            border: 'var(--white)',
            rgb: 'var(--white-rgb)',
            focus: `rgba(var(--white-rgb) / ${FOCUS_OPACITY}%)`,
        },
    },
    ...colorsWithoutBlackAndWhite.reduce(
        (acc, color) => {
            acc[color] = {
                primary: {
                    background: `var(--${color})`,
                    foreground: hasBadContrast(colors.white, 'readable', colors[color])
                        ? 'var(--black)'
                        : 'var(--white)',
                    backgroundActive: `var(--${color}-${COLOR_ACTIVE_SHADE})`,
                    border: `transparent`,
                    rgb: `var(--${color}-rgb)`,
                    focus: `rgba(var(--${color}-rgb) / ${FOCUS_OPACITY}%)`,
                },
                secondary: {
                    background: 'transparent',
                    foreground: `var(--${color})`,
                    backgroundActive: `rgb(var(--${color}-rgb) / ${SECONDARY_ACTIVE_OPACITY}%)`,
                    border: `var(--${color})`,
                    rgb: `var(--${color}-rgb)`,
                    focus: `rgba(var(--${color}-rgb) / ${FOCUS_OPACITY}%)`,
                },
            }
            return acc
        },
        {} as Record<ColorsWithoutBlackAndWhite, ButtonVariantColors>,
    ),
}
