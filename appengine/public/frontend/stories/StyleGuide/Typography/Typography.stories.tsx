import { FixedViewportProvider } from '@src/providers/FixedViewportProvider/index.ts'
import type { Meta, StoryObj } from '@storybook/nextjs'
import cn from 'classnames'
import { useEffect, useState } from 'react'
import styles from './Typography.module.scss'

interface TypographyCopyProps {
    value: string
}

const TypographyCopy = ({ value }: TypographyCopyProps) => {
    const [mixinCopied, setMixinCopied] = useState(false)
    const [classCopied, setClassCopied] = useState(false)

    const mixin = `@include t.type(${value});`
    const className = `type ${value}`

    useEffect(() => {
        if (mixinCopied) {
            const timeout = window.setTimeout(() => setMixinCopied(false), 2000)
            return () => clearTimeout(timeout)
        }
    }, [mixinCopied])

    useEffect(() => {
        if (classCopied) {
            const timeout = window.setTimeout(() => setClassCopied(false), 2000)
            return () => clearTimeout(timeout)
        }
    }, [classCopied])

    return (
        <div className={styles.typographyCopy}>
            <button
                data-copied={mixinCopied}
                type='button'
                title={mixin}
                onClick={() => {
                    navigator.clipboard.writeText(mixin)
                    setMixinCopied(true)
                    setClassCopied(false)
                }}>
                <span className={styles.label}>
                    <span className={styles.copyIcon}>⎘</span> mixin
                </span>
                <span className={styles.checkIcon} aria-label='Copied' role='img'>
                    ✓
                </span>
            </button>
            <button
                data-copied={classCopied}
                type='button'
                title={className}
                onClick={() => {
                    navigator.clipboard.writeText(className)
                    setClassCopied(true)
                    setMixinCopied(false)
                }}>
                <span className={styles.label}>
                    <span className={styles.copyIcon}>⎘</span> class
                </span>
                <span className={styles.checkIcon} aria-label='Copied' role='img'>
                    ✓
                </span>
            </button>
        </div>
    )
}

const TypographyComponent = () => {
    return (
        <div className={cn(styles.container, styles.typography)}>
            <div className='type header-1'>
                Header 1 → google-sans-display, 2.6rem, line-height: 0.95
                <TypographyCopy value='header-1' />
            </div>
            <div className='type header-2'>
                Header 2 → google-sans-display, 2rem, line-height: 1.05
                <TypographyCopy value='header-2' />
            </div>
            <div className='type header-3'>
                Header 3 → google-sans-display, 1.6rem, line-height: 1.15
                <TypographyCopy value='header-3' />
            </div>
            <div className='type header-4'>
                Header 4 → google-sans-display, 1.8rem, line-height: 1.15
                <TypographyCopy value='header-4' />
            </div>
            <div className='type header-4-mono'>
                Header 4 Mono → google-sans-mono, 1.4rem, line-height: 1.15
                <TypographyCopy value='header-4-mono' />
            </div>
            <div className='type header-5'>
                Header 5 → google-sans-display, 1rem, line-height: 1.15
                <TypographyCopy value='header-5' />
            </div>
            <div className='type subheader-1'>
                Subheader 1 → google-sans-display, 1rem, line-height: 1.15
                <TypographyCopy value='subheader-1' />
            </div>
            <div className='type body'>
                Body → google-sans-text, 1rem, line-height: 1.33
                <TypographyCopy value='body' />
            </div>
            <div className='type label'>
                Text Label → google-sans-text, 1.06rem, line-height: 1.35
                <TypographyCopy value='label' />
            </div>
            <div className='type button'>
                Text Button → google-sans-text, 500, 0.85rem, line-height: 1.33
                <TypographyCopy value='button' />
            </div>
            <div className='type button-mono'>
                Text Button Mono → google-sans-mono, 500, 0.65rem, line-height: 1.33
                <TypographyCopy value='button-mono' />
            </div>
            <div className='type error-mono'>
                Error Mono → google-sans-mono, 500, 1.15rem, line-height: 1.33
                <TypographyCopy value='error-mono' />
            </div>
            <div className='type footnote'>
                Text Footnote → google-sans-text, 1.5rem, line-height: 1.33
                <TypographyCopy value='footnote' />
            </div>
            <div className='type label-mono'>
                Text Label Mono → google-sans-mono, 0.75rem, line-height: 1.33
                <TypographyCopy value='label-mono' />
            </div>
        </div>
    )
}

// Storybook configuration
const meta: Meta = {
    title: 'Frontend/Style Guide/Typography',
    parameters: {
        layout: 'fullscreen',
        docs: {
            description: {
                component:
                    'Typography showcase displaying all available text styles and type scales in the design system.',
            },
        },
    },
    decorators: [
        (Story) => (
            <FixedViewportProvider mode='landscape'>
                <Story />
            </FixedViewportProvider>
        ),
    ],
}

export default meta
type Story = StoryObj

export const Typography: Story = {
    parameters: {
        docs: {
            description: {
                story: 'Complete typography guide displaying all available text styles in the design system.',
            },
        },
    },
    render: () => <TypographyComponent />,
}
