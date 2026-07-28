import { colors, themesRaw } from '@shared/ts/colors/index.ts'
import type { Meta, StoryObj } from '@storybook/nextjs'
import styles from './Colors.module.scss'
import { Swatch } from './Swatch.tsx'

// Define color role groups for better organization
const colorRoleGroups = {
    'Primary Colors': ['primary', 'on-primary', 'primary-container', 'on-primary-container'],
    'Secondary Colors': [
        'secondary',
        'on-secondary',
        'secondary-container',
        'on-secondary-container',
    ],
    'Tertiary Colors': ['tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container'],
    'Error Colors': ['error', 'on-error', 'error-container', 'on-error-container'],
    'Background & Surface': [
        'background',
        'on-background',
        'surface',
        'on-surface',
        'on-surface-variant',
    ],
    'Surface Container Lowest': ['surface-container-lowest', 'on-surface-container-lowest'],
    'Surface Container Low': ['surface-container-low', 'on-surface-container-low'],
    'Surface Container': ['surface-container', 'on-surface-container'],
    'Surface Container High': ['surface-container-high', 'on-surface-container-high'],
    'Surface Container Highest': ['surface-container-highest', 'on-surface-container-highest'],
    outlines: ['outline', 'outline-variant'],
} as const

// Define the component
const ThemesComponent = () => (
    <div className={styles.container}>
        <div className={styles.section}>
            <h1 className={styles.title}>Themes</h1>
            {Object.entries(themesRaw).map(([themeName, themeColors]) => (
                <div key={themeName} className={styles.section}>
                    <h3 className={styles.sectionTitle}>{themeName} Theme</h3>
                    {Object.entries(colorRoleGroups).map(([groupName, roleKeys]) => {
                        // Filter to only show roles that exist in this theme
                        const existingRoles = roleKeys.filter((role) => role in themeColors)

                        if (existingRoles.length === 0) return null

                        return (
                            <div key={groupName} className={styles.palette}>
                                <div className={styles.swatches}>
                                    {existingRoles.map((colorRole) => {
                                        const colorKey =
                                            themeColors[colorRole as keyof typeof themeColors]
                                        // Resolve the color key to the actual color value
                                        const colorValue =
                                            colors[colorKey as keyof typeof colors] || colorKey
                                        return (
                                            <Swatch
                                                key={colorRole}
                                                color={colorValue}
                                                label={colorRole}
                                                jsAccess={
                                                    colorRole.includes('-')
                                                        ? `colors[themes.${themeName}['${colorRole}']]`
                                                        : `colors[themes.${themeName}.${colorRole}]`
                                                }
                                                cssAccess={`var(--md-sys-color-${colorRole})`}
                                                rgbAccess={`rgb(var(--md-sys-color-${colorRole}-rgb) / 100%)`}
                                            />
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            ))}
        </div>
    </div>
)

// Storybook configuration
const meta: Meta = {
    title: 'Shared/Style Guide/Themes',
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'Theme showcase displaying all available themes in the design system, organized by semantic color groups.',
            },
        },
    },
}

export default meta
type Story = StoryObj

export const Themes: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Complete theme guide displaying all available themes in the design system, organized by semantic color role groups for better understanding.',
            },
        },
    },
    render: () => <ThemesComponent />,
}
