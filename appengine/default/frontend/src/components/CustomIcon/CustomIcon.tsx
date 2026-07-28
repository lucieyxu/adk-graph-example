import { MdIcon, type MdIconProps } from '@shared/ts/components/MdIcon/index.ts'
import cn from 'classnames'
import { omit } from 'lodash'
import type React from 'react'
import styles from './CustomIcon.module.scss'
import { type CustomIconName, icons } from './icons/icons.ts'

const iconNames = Object.keys(icons) as CustomIconName[]

interface CustomIconProps extends React.HTMLAttributes<HTMLElement> {
    icon: CustomIconName
}

export const CustomIcon: React.FC<CustomIconProps> = ({ icon, className, ...props }) => {
    const SelectedIcon = icons[icon]

    if (process.env.NODE_ENV === 'development' && !SelectedIcon) {
        console.warn(`No such icon: ${SelectedIcon}`)
        return null
    }

    if (!SelectedIcon) return null

    return <SelectedIcon {...props} className={cn(styles.icon, className)} />
}

export interface IconProps extends React.HTMLAttributes<HTMLElement> {
    icon: CustomIconName | MdIconProps['icon']

    /**
     * Note: This prop is not supported for {@link CustomIcon}
     */
    size?: string

    /**
     * Note: This prop is not supported for {@link CustomIcon}
     */
    filled?: boolean

    /**
     * Note: This prop is not supported for {@link CustomIcon}
     */
    corners?: 'rounded' | 'sharp'
}

/**
 * An icon component for rendering icons available in either a {@link CustomIcon} or {@link MdIcon}
 */
export const Icon = ({ icon, ...props }: IconProps) =>
    iconNames.includes(icon as CustomIconName) ? (
        <CustomIcon icon={icon as CustomIconName} {...omit(props, 'filled')} />
    ) : (
        <MdIcon icon={icon as MdIconProps['icon']} {...props} />
    )
