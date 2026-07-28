import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import style from './StageTransition.module.scss'

const variants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
}

interface StageTransitionOptions {
    onAnimationComplete: (variant: keyof typeof variants) => void
}

export const StageTransition = ({
    children,
    options,
}: {
    children: ReactNode
    options?: StageTransitionOptions
}) => {
    return (
        <motion.div
            className={style.StageTransition}
            variants={variants}
            initial='initial'
            animate='animate'
            exit='exit'
            transition={{ duration: 0.15 }}
            onAnimationComplete={options?.onAnimationComplete}>
            {children}
        </motion.div>
    )
}
