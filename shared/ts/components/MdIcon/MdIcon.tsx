import { MdIconBase } from '@shared/ts/lib/material.ts'

import cn from 'classnames'
import type { Icon } from './icons.ts'
import styles from './MdIcon.module.scss'

export interface MdIconProps extends React.HTMLAttributes<HTMLElement> {
    icon: Icon
    size?: string
    className?: string
    filled?: boolean
    corners?: 'rounded' | 'sharp'
}

export const MdIcon = ({
    icon,
    size,
    className,
    corners = 'rounded',
    filled = true,
    ...rest
}: MdIconProps) => (
    <MdIconBase
        className={cn(styles.icon, filled && styles.filled, corners && styles[corners], className)}
        style={size ? { fontSize: size } : {}}
        {...rest}>
        {icon}
    </MdIconBase>
)
