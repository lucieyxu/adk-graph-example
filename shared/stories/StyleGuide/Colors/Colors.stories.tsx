import { colorsRaw, DEFAULT_COLOR_SHADE } from '@shared/ts/colors/index.ts'
import type { Meta, StoryObj } from '@storybook/nextjs'
import styles from './Colors.module.scss'
import { Swatch } from './Swatch.tsx'

// Define the component
const ColorsComponent = () => {
    // Color palettes to display
    const colorPalettes = Object.entries(colorsRaw).reduce(
        (acc, [key, value]) => {
            if (!key.includes('-')) return acc
            const colorName = key.split('-')[0] as keyof typeof colorsRaw
            if (!acc[colorName]) acc[colorName] = []
            acc[colorName].push([key, value])
            return acc
        },
        {} as Record<string, [string, string][]>,
    )

    return (
        <div className={styles.container}>
            <div className={styles.section}>
                <h1 className={styles.title}>Color Palettes</h1>

                <div className={styles.colorGrid}>
                    {Object.entries(colorPalettes).map(([paletteName, paletteColors]) => (
                        <div key={paletteName} className={styles.palette}>
                            <h3 className={styles.paletteName}>{paletteName}</h3>
                            <div className={styles.swatches}>
                                {paletteColors.map(([colorName, colorValue]) => {
                                    const jsAccess = colorName.endsWith(`-${DEFAULT_COLOR_SHADE}`)
                                        ? `colors.${paletteName}`
                                        : `colors.${colorName.includes('-') ? `['${colorName}']` : `${colorName}`}`
                                    const cssAccess = `var(--${colorName})`
                                    return (
                                        <Swatch
                                            key={colorName}
                                            color={colorValue}
                                            label={colorName.split('-')[1] ?? ''}
                                            jsAccess={jsAccess}
                                            cssAccess={cssAccess}
                                            rgbAccess={`rgb(var(--${colorName}-rgb) / 100%)`}
                                        />
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// Storybook configuration
const meta: Meta = {
    title: 'Shared/Style Guide/Colors',
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'Color palette showcase displaying all available colors in the design system.',
            },
        },
    },
}

export default meta
type Story = StoryObj

export const Colors: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Complete color guide displaying all available colors in the design system.',
            },
        },
    },
    render: () => <ColorsComponent />,
}
