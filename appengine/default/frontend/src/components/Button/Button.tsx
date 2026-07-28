import type { ColorName } from '@shared/ts/colors/index.ts'
import { MdIcon, type MdIconProps } from '@shared/ts/components/MdIcon/index.ts'
import { useIncrementingKey } from '@shared/ts/hooks/useIncrementingKey.ts'
import { generateCssVariables } from '@shared/ts/lib/cssVars.ts'
import { fixTouchActive } from '@shared/ts/lib/fixTouchActive.ts'
import { bezierEasing, revealUpFullDownProps, revealWidthProps } from '@shared/ts/lib/motion.ts'
import classNames from 'classnames'
import type { Transition } from 'motion'
import { AnimatePresence, type MotionProps, motion } from 'motion/react'
import Link from 'next/link'
import {
    type ComponentProps,
    type PropsWithChildren,
    type ReactElement,
    type ReactNode,
    useMemo,
} from 'react'
import styles from './Button.module.scss'
import { buttonColors } from './constants.ts'

const transition: Transition = {
    ease: bezierEasing,
    duration: 0.75,
} as const

type ButtonElement = HTMLButtonElement | HTMLAnchorElement | HTMLDivElement

type ButtonAsProps =
    | {
          as?: 'a'
          href?: ComponentProps<'a'>['href']
          target?: ComponentProps<'a'>['target']
      }
    | {
          as?: 'button' | 'div'
          href?: never
          target?: never
      }

export const buttonVariants = ['primary', 'secondary', 'text'] as const
type ButtonVariants = (typeof buttonVariants)[number]
export const buttonSizes = ['small', 'medium', 'large'] as const
type ButtonSizes = (typeof buttonSizes)[number]
export const buttonIconPositions = ['right', 'left'] as const
type ButtonIconPositions = (typeof buttonIconPositions)[number]

export type ButtonProps = Omit<MotionProps, 'children'> &
    PropsWithChildren &
    ButtonAsProps & {
        variant?: ButtonVariants
        size?: ButtonSizes
        icon?: MdIconProps['icon'] | ReactNode
        iconFilled?: MdIconProps['filled']
        iconSize?: MdIconProps['size']
        iconPosition?: ButtonIconPositions
        iconKey?: string
        color?: ColorName
        className?: string
        disabled?: boolean
        onClick?: (event: React.MouseEvent<ButtonElement>) => void
    }

export const buttonDefaults = {
    variant: buttonVariants[0],
    size: buttonSizes[1],
    iconPosition: buttonIconPositions[0],
    iconFilled: true,
    color: 'blue',
} as const

export const Button = ({
    as = 'button',
    variant = buttonDefaults.variant,
    size = buttonDefaults.size,
    iconPosition = buttonDefaults.iconPosition,
    iconFilled = buttonDefaults.iconFilled,
    color = buttonDefaults.color,
    children,
    className,
    icon,
    iconSize,
    style,
    ...props
}: ButtonProps) => {
    const Component = motion[as]
    const currentColors = buttonColors[color][variant === 'text' ? 'primary' : variant]
    const iconOnly = !!icon && !children
    const currentIconKey = useIncrementingKey(
        icon && typeof icon === 'string'
            ? icon
            : icon && typeof icon === 'object' && 'key' in icon
              ? (icon as ReactElement).key
              : icon?.toString(),
    )

    const cssVars = useMemo(
        () =>
            generateCssVariables(currentColors, (key, value) => [`button-internal-${key}`, value]),
        [currentColors],
    )

    const content = (
        <Component
            className={classNames(
                styles.button,
                size && styles[size],
                !!icon && (iconOnly ? styles.iconOnly : styles.icon),
                iconPosition === 'left' ? styles.iconLeft : styles.iconRight,
                className,
            )}
            data-variant={variant}
            style={{ ...cssVars, ...style }}
            {...fixTouchActive<ButtonElement>()}
            {...props}>
            {children}
            <AnimatePresence initial={false}>
                {!!icon && (
                    <motion.span
                        key='icon-wrapper'
                        className={styles.iconContainerOuter}
                        transition={transition}
                        {...revealWidthProps}>
                        <AnimatePresence mode='popLayout' initial={false}>
                            <motion.div
                                key={currentIconKey}
                                className={styles.iconContainer}
                                transition={transition}
                                {...revealUpFullDownProps}>
                                {typeof icon === 'string' ? (
                                    <MdIcon
                                        className={styles.icon}
                                        icon={icon as MdIconProps['icon']}
                                        filled={iconFilled}
                                        size={iconSize}
                                    />
                                ) : (
                                    <div className={styles.customIconWrapper}>
                                        <div className={styles.customIcon}>{icon}</div>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>
                    </motion.span>
                )}
            </AnimatePresence>
        </Component>
    )

    if (as === 'a' && 'href' in props && props.href) {
        return (
            <Link href={props.href} target={props.target} passHref>
                {content}
            </Link>
        )
    }

    return content
}
