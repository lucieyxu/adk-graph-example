import { colorNames } from '@shared/ts/colors/index.ts'
import { MdCircularProgress } from '@shared/ts/lib/material.ts'
import { FixedViewportProvider } from '@src/providers/FixedViewportProvider/index.ts'
import type { Meta, StoryObj } from '@storybook/react'
import cn from 'classnames'
import type { CSSProperties as CSS } from 'react'
import { useRef, useState } from 'react'
import { fn } from 'storybook/test'
import { Button, type ButtonProps, buttonDefaults, buttonSizes, buttonVariants } from './Button.tsx'
import styles from './ButtonStories.module.scss'

const meta: Meta<typeof Button> = {
    title: 'Frontend/Components/Button',
    component: Button,
    parameters: { layout: 'fullscreen' },
    argTypes: {
        children: { table: { disable: true } },
        className: { table: { disable: true } },
        onClick: { table: { disable: true } },
        as: {
            control: 'select',
            options: ['button', 'a', 'div'],
            description: 'HTML element to render',
        },
        disabled: {
            control: 'boolean',
            description: 'Disabled state',
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

const CopyButton = ({ text, icon, ...props }: ButtonProps & { text: string }) => {
    const [copied, setCopied] = useState(false)
    const timeout = useRef(-1)

    return (
        <Button
            {...props}
            icon={copied ? 'check' : icon}
            onClick={() => {
                window.clearTimeout(timeout.current)
                navigator.clipboard.writeText(text)
                setCopied(true)
                timeout.current = window.setTimeout(() => setCopied(false), 2000)
            }}>
            {props.children}
        </Button>
    )
}

const generateButtonCode = (props: ButtonProps) => {
    let propsString = ''
    const propPairs: string[] = []

    // Only include non-default props
    if (props.variant && props.variant !== buttonDefaults.variant)
        propPairs.push(`variant="${props.variant}"`)
    if (props.size && props.size !== buttonDefaults.size) propPairs.push(`size="${props.size}"`)
    if (props.color && props.color !== buttonDefaults.color)
        propPairs.push(`color="${props.color}"`)
    if (props.icon) propPairs.push(`icon="${props.icon}"`)
    if (props.iconPosition && props.iconPosition !== buttonDefaults.iconPosition)
        propPairs.push(`iconPosition="${props.iconPosition}"`)
    if (props.iconFilled && props.iconFilled !== buttonDefaults.iconFilled)
        propPairs.push(`iconFilled="${props.iconFilled}"`)
    if (props.iconSize) propPairs.push(`iconSize="${props.iconSize}"`)
    if (props.as && props.as !== 'button') propPairs.push(`as="${props.as}"`)
    if (props.href) propPairs.push(`href="${props.href}"`)

    if (propPairs.length > 0) propsString = ` ${propPairs.join(' ')}`

    return props.children
        ? `<Button${propsString}>${props.children}</Button>`
        : `<Button${propsString} />`
}

export default meta
type Story = StoryObj<typeof Button>

export const Default: Story = {
    argTypes: {
        color: {
            control: 'select',
            options: colorNames,
            description: 'Button color',
        },
        variant: {
            control: 'select',
            options: ['primary', 'secondary'],
            description: 'Button variant',
        },
        size: {
            control: 'select',
            options: ['medium', 'small', 'large'],
        },
        icon: {
            control: 'select',
            options: ['home', 'home', 'arrow_back', 'refresh'],
            description: 'Material icon name',
        },
        iconPosition: {
            control: 'select',
            options: ['left', 'right'],
            description: 'Position of the icon',
        },
        href: {
            control: 'text',
            description: 'URL for anchor element',
            if: { arg: 'as', eq: 'a' },
        },
    },
    args: {
        size: 'medium',
        color: 'blue',
        variant: 'primary',
        children: 'Button Text',
        onClick: fn(),
    },
    decorators: [
        (Story) => (
            <div className={styles.flexRowFullHeight}>
                <div className={styles.decoratorContainer}>
                    <Story />
                </div>
                <div className={styles.decoratorContainerLight}>
                    <Story />
                </div>
            </div>
        ),
    ],
}

export const All: Story = {
    args: {
        children: 'Copy me',
        disabled: false,
        as: 'button',
        href: undefined,
        iconPosition: 'right',
        icon: 'arrow_forward',
        iconFilled: true,
    },
    argTypes: {
        variant: { table: { disable: true } },
        size: { table: { disable: true } },
        color: { table: { disable: true } },
        iconSize: { table: { disable: true } },
        href: { type: 'string' },
        icon: { type: 'string' },
        iconPosition: { control: 'select', options: ['left', 'right'] },
        iconFilled: { type: 'boolean' },
    },
    render: ({ children, icon, ...args }) => {
        return (
            <div className={styles.storyContainer}>
                <h2 className={cn('type header-4-mono', styles.sectionHeader)}>
                    Tip: Click any button to copy it's code to your clipboard
                </h2>
                <div className={styles.sectionContainer}>
                    <h3 className={cn('type header-5', styles.sectionHeader)}>
                        All Variant × Size Combinations
                    </h3>
                    <div className={styles['backgroundContainer--white']}>
                        <table className={styles.storyTable}>
                            <thead>
                                <tr>
                                    <th className={cn('type label', styles['tableHeader--left'])}>
                                        Variant
                                    </th>
                                    {buttonSizes.map((size) => (
                                        <th
                                            key={size}
                                            className={cn('type label', styles.tableSizeHeader)}>
                                            {size}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {/* Text only buttons */}
                                {buttonVariants.map((variant) => (
                                    <tr key={variant}>
                                        <td
                                            className={cn(
                                                'type label',
                                                styles['tableCell--label'],
                                            )}>
                                            {variant}
                                        </td>
                                        {buttonSizes.map((size) => (
                                            <td
                                                key={size}
                                                className={styles['tableCell--centeredBlack']}>
                                                <CopyButton
                                                    {...args}
                                                    variant={variant}
                                                    size={size}
                                                    text={generateButtonCode({
                                                        variant,
                                                        size,
                                                        children: children as string,
                                                        ...args,
                                                    })}>
                                                    {children}
                                                </CopyButton>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {/* Icon + text buttons */}
                                {buttonVariants.map((variant) => (
                                    <tr key={`${variant}-icon-text`}>
                                        <td
                                            className={cn(
                                                'type label',
                                                styles['tableCell--label'],
                                            )}>
                                            {variant} + icon
                                        </td>
                                        {buttonSizes.map((size) => (
                                            <td
                                                key={size}
                                                className={styles['tableCell--centeredBlack']}>
                                                <CopyButton
                                                    {...args}
                                                    variant={variant}
                                                    size={size}
                                                    icon={icon}
                                                    text={generateButtonCode({
                                                        variant,
                                                        size,
                                                        icon,
                                                        ...args,
                                                    })}>
                                                    {children}
                                                </CopyButton>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                                {/* Icon only buttons */}
                                {buttonVariants.map((variant) => (
                                    <tr key={`${variant}-icon-only`}>
                                        <td
                                            className={cn(
                                                'type label',
                                                styles['tableCell--label'],
                                            )}>
                                            {variant} icon only
                                        </td>
                                        {buttonSizes.map((size) => (
                                            <td
                                                key={size}
                                                className={styles['tableCell--centeredBlack']}>
                                                <CopyButton
                                                    {...args}
                                                    variant={variant}
                                                    size={size}
                                                    icon={icon}
                                                    text={generateButtonCode({
                                                        variant,
                                                        size,
                                                        icon,
                                                        ...args,
                                                    })}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                ;
                <div className={styles.sectionContainer}>
                    <h3 className={cn('type header-5', styles.sectionHeader)}>
                        All Color × Variant Combinations
                    </h3>
                    <div className={styles['backgroundContainer--white']}>
                        <table className={styles.storyTable}>
                            <thead>
                                <tr>
                                    <th className={cn('type label', styles['tableHeader--left'])}>
                                        Color
                                    </th>
                                    {buttonVariants.map((variant) => (
                                        <th
                                            key={variant}
                                            className={cn('type label', styles.tableVariantHeader)}>
                                            {variant}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {colorNames.map((color) => (
                                    <tr key={color}>
                                        <td
                                            className={cn(
                                                'type label',
                                                styles['tableCell--label'],
                                            )}>
                                            {color}
                                        </td>
                                        {buttonVariants.map((variant) => (
                                            <td
                                                key={variant}
                                                className={styles['tableCell--dynamicBg']}
                                                data-color={color}>
                                                <CopyButton
                                                    {...args}
                                                    color={color}
                                                    variant={variant}
                                                    text={generateButtonCode({
                                                        variant,
                                                        color,
                                                        children: children as string,
                                                        ...args,
                                                    })}>
                                                    {children}
                                                </CopyButton>
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                ;
                <div className={styles.sectionContainer}>
                    <h3 className={cn('type header-5', styles.sectionHeader)}>
                        Icon Button Variants × Color Combinations
                    </h3>
                    <div className={styles['backgroundContainer--white']}>
                        <table className={styles.storyTable}>
                            <thead>
                                <tr>
                                    <th className={cn('type label', styles['tableHeader--left'])}>
                                        Color
                                    </th>
                                    {buttonVariants.map((variant) => (
                                        <th
                                            key={`${variant}-icon-text`}
                                            className={cn('type label', styles.tableVariantHeader)}>
                                            {variant} + icon
                                        </th>
                                    ))}
                                    {buttonVariants.map((variant) => (
                                        <th
                                            key={`${variant}-icon-only`}
                                            className={cn('type label', styles.tableVariantHeader)}>
                                            {variant} icon only
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {colorNames.map((color) => (
                                    <tr key={color}>
                                        <td
                                            className={cn(
                                                'type label',
                                                styles['tableCell--label'],
                                            )}>
                                            {color}
                                        </td>
                                        {/* Icon + text */}
                                        {buttonVariants.map((variant) => (
                                            <td
                                                key={`${variant}-icon-text`}
                                                className={styles['tableCell--dynamicBg']}
                                                data-color={color}>
                                                <CopyButton
                                                    {...args}
                                                    color={color}
                                                    variant={variant}
                                                    icon={icon}
                                                    text={generateButtonCode({
                                                        variant,
                                                        color,
                                                        icon,
                                                        children: children as string,
                                                        ...args,
                                                    })}>
                                                    {children}
                                                </CopyButton>
                                            </td>
                                        ))}
                                        {/* Icon only */}
                                        {buttonVariants.map((variant) => (
                                            <td
                                                key={`${variant}-icon-only`}
                                                className={styles['tableCell--dynamicBg']}
                                                data-color={color}>
                                                <CopyButton
                                                    {...args}
                                                    color={color}
                                                    variant={variant}
                                                    icon={icon}
                                                    text={generateButtonCode({
                                                        variant,
                                                        color,
                                                        icon,
                                                        ...args,
                                                    })}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )
    },
}

export const CustomIconComponent: Story = {
    argTypes: {
        color: {
            control: 'select',
            options: colorNames,
            description: 'Button color',
        },
        variant: {
            control: 'select',
            options: ['primary', 'secondary'],
            description: 'Button variant',
        },
        size: {
            control: 'select',
            options: ['medium', 'small', 'large'],
        },
        icon: {
            control: 'select',
            options: ['home', 'home', 'arrow_back', 'refresh'],
            description: 'Material icon name',
        },
        iconPosition: {
            control: 'select',
            options: ['left', 'right'],
            description: 'Position of the icon',
        },
        href: {
            control: 'text',
            description: 'URL for anchor element',
            if: { arg: 'as', eq: 'a' },
        },
    },
    args: {
        size: 'medium',
        color: 'blue',
        variant: 'secondary',
        children: 'Button Text',
        onClick: fn(),
        icon: (
            <MdCircularProgress
                indeterminate
                style={
                    {
                        '--md-circular-progress-size': '1.5em',
                        '--md-circular-progress-active-indicator-color':
                            'var(--button-foreground, var(--button-internal-foreground, var(--black)))',
                    } as CSS
                }
            />
        ),
    },
    decorators: [
        (Story) => (
            <div className={styles.flexRowFullHeight}>
                <div className={styles.decoratorContainer}>
                    <Story />
                </div>
                <div className={styles.decoratorContainerLight}>
                    <Story />
                </div>
            </div>
        ),
    ],
}
