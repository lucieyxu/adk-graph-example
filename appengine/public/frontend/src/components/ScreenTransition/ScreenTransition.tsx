import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import style from './ScreenTransition.module.scss'

const variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
}

interface ScreenTransitionOptions {
    onAnimationComplete: (variant: keyof typeof variants) => void
}

export const ScreenTransition = ({
    children,
    options,
}: {
    children: ReactNode
    options?: ScreenTransitionOptions
}) => {
    return (
        <motion.div
            className={style.ScreenTransition}
            variants={variants}
            initial='initial'
            animate='animate'
            exit='exit'
            transition={{ duration: 0.3 }}
            onAnimationComplete={options?.onAnimationComplete}>
            {children}
        </motion.div>
    )
}
