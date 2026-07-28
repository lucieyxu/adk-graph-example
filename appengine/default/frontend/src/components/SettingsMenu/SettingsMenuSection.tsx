import { MdIcon } from '@shared/ts/components/MdIcon/index.ts'
import { motion } from 'motion/react'
import { type PropsWithChildren, useState } from 'react'
import styles from './SettingsMenu.module.scss'

interface Props extends PropsWithChildren {
    title: string
    expandedByDefault?: boolean
    collapsible?: boolean
}

export const SettingsMenuSection = ({
    title,
    children,
    expandedByDefault = false,
    collapsible = true,
}: Props) => {
    const [isOpen, setIsOpen] = useState(collapsible ? expandedByDefault : true)

    return (
        <div className={styles.section} data-expanded={isOpen}>
            <button
                data-collapsibie={collapsible}
                className={styles.header}
                type='button'
                onClick={() => {
                    if (collapsible) setIsOpen(!isOpen)
                }}>
                <div className={styles.headerInner}>
                    {collapsible && (
                        <div className={styles.headerIcon}>
                            <MdIcon icon='arrow_forward_ios' />
                        </div>
                    )}

                    <h3>{title}</h3>
                </div>
            </button>

            {collapsible && (
                <motion.div
                    className={styles.content}
                    initial={{ height: expandedByDefault ? 'auto' : 0 }}
                    animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
                    transition={{ duration: 0.5, type: 'spring', bounce: 0 }}>
                    <div className={styles.contentInner}>{children}</div>
                </motion.div>
            )}
            {!collapsible && (
                <div className={styles.content}>
                    <div className={styles.contentInner}>{children}</div>
                </div>
            )}
        </div>
    )
}
