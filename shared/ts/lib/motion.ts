import type { MotionProps, Variant, Variants } from 'motion/react'

type Easing = [number, number, number, number]
export const bezierEasing = [0.075, 0.82, 0.165, 1] as const satisfies Easing

export const bezier2Easing = [0.33, 0.0, 0, 1.0] as const satisfies Easing

const MaterialEasingKeys = [
    'standard',
    'standardAccelerate',
    'standardDecelerate',
    'emphasized',
    'emphasizedAccelerate',
    'emphasizedDecelerate',
] as const

//reference: https://github.com/material-components/material-web/blob/main/internal/motion/animation.ts
export const MATERIAL_EASING: Record<
    (typeof MaterialEasingKeys)[number],
    [number, number, number, number]
> = {
    standard: [0.2, 0, 0, 1],
    standardAccelerate: [0.3, 0, 1, 1],
    standardDecelerate: [0, 0, 0, 1],
    emphasized: [0.3, 0, 0, 1],
    emphasizedAccelerate: [0.3, 0, 0.8, 0.15],
    emphasizedDecelerate: [0.05, 0.7, 0.1, 1],
}

/**
 * MotionProps but the `children` prop omitted
 */
export type MotionPropsNC = Omit<MotionProps, 'children'>

export interface PresenceVariants extends Variants {
    initial: Variant
    visible: Variant
    exit: Variant
}
export type PresenceVariantNames = keyof PresenceVariants

export interface PresenceVariantsDefinition {
    variants: PresenceVariants
}

// Variants: child level spreads

export const orchestrateVariants: MotionPropsNC = {
    variants: {
        initial: { opacity: 1 },
        visible: { opacity: 1 },
        exit: { opacity: 1 },
    },
}

export const revealVariants: MotionPropsNC = {
    variants: {
        initial: { opacity: 0 },
        visible: { opacity: 1 },
        exit: { opacity: 0 },
    },
}

export const blurRevealVariants: MotionPropsNC = {
    variants: {
        initial: { opacity: 0, filter: 'blur(20px)' },
        visible: { opacity: 1, filter: 'blur(0px)' },
        exit: { opacity: 0, filter: 'blur(20px)' },
    },
}

export const revealUpVariants: MotionPropsNC = {
    variants: {
        initial: { y: 50, opacity: 0 },
        visible: { y: 0, opacity: 1 },
        exit: { y: 50, opacity: 0 },
    },
}

export const revealUpFullDownVariants: MotionPropsNC = {
    variants: {
        initial: { y: '-100%', opacity: 0 },
        visible: { y: 0, opacity: 1 },
        exit: { y: '100%', opacity: 0 },
    },
}

export const revealRightVariants: MotionPropsNC = {
    variants: {
        initial: { x: -50, opacity: 0 },
        visible: { x: 0, opacity: 1 },
        exit: { x: -50, opacity: 0 },
    },
}

export const revealLeftVariants: MotionPropsNC = {
    variants: {
        initial: { x: 50, opacity: 0 },
        visible: { x: 0, opacity: 1 },
        exit: { x: 50, opacity: 0 },
    },
}

export const revealHeightVariants: MotionPropsNC = {
    variants: {
        initial: { height: 0, opacity: 0 },
        visible: { height: 'auto', opacity: 1 },
        exit: { height: 0, opacity: 0 },
    },
}

export const revealWidthVariants: MotionPropsNC = {
    variants: {
        initial: { width: 0, opacity: 0 },
        visible: { width: 'auto', opacity: 1 },
        exit: { width: 0, opacity: 0 },
    },
}

export const revealZoomVariants: MotionPropsNC = {
    variants: {
        initial: { scale: 0, opacity: 0 },
        visible: { scale: 1, opacity: 1 },
        exit: { scale: 0, opacity: 0 },
    },
}

const variantMap: Record<string, keyof PresenceVariants> = {
    initial: 'initial',
    animate: 'visible',
    exit: 'exit',
}

// Props: parent level spreads
export const revealProps: MotionPropsNC = {
    ...revealVariants,
    ...variantMap,
}

export const revealUpProps: MotionPropsNC = {
    ...revealUpVariants,
    ...variantMap,
}

export const revealUpFullDownProps: MotionPropsNC = {
    ...revealUpFullDownVariants,
    ...variantMap,
}

export const revealRightProps: MotionPropsNC = {
    ...revealRightVariants,
    ...variantMap,
}

export const revealLeftProps: MotionPropsNC = {
    ...revealLeftVariants,
    ...variantMap,
}

export const orchestrateProps: MotionPropsNC = {
    ...orchestrateVariants,
    ...variantMap,
}

export const revealHeightProps: MotionPropsNC = {
    ...revealHeightVariants,
    ...variantMap,
}

export const revealWidthProps: MotionPropsNC = {
    ...revealWidthVariants,
    ...variantMap,
}

export const revealZoomProps: MotionPropsNC = {
    ...revealZoomVariants,
    ...variantMap,
}

export const defaultSpringTransition: MotionPropsNC['transition'] = {
    type: 'spring',
    duration: 1,
    bounce: 0,
}
