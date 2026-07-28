import type { DialogAnimation } from '@material/web/dialog/internal/animations'
import { MATERIAL_EASING } from '@shared/ts/lib/motion.ts'
import { bezierToCss } from '@shared/ts/lib/utils.ts'

const DIALOG_ANIMATION_DURATION = 300
const FINAL_SCRIM_OPACITY = 0.32
const DIALOG_HIDDEN_SCALE = 0.9
const EASING = bezierToCss(MATERIAL_EASING.standard)

// reference: https://github.com/material-components/material-web/blob/main/internal/dialog/animation.ts
export const DIALOG_DEFAULT_OPEN_ANIMATION: DialogAnimation = {
    dialog: [
        [
            // Dialog slide up and fade in
            [
                { transform: 'translateY(30%)', opacity: 0 },
                { transform: 'translateY(0)', opacity: 1 },
            ],
            { duration: DIALOG_ANIMATION_DURATION, easing: EASING },
        ],
        [
            // Dialog scale up
            [{ scale: DIALOG_HIDDEN_SCALE }, { scale: 1 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
            },
        ],
    ],
    scrim: [
        [
            // Scrim fade in
            [{ opacity: 0 }, { opacity: FINAL_SCRIM_OPACITY }],
            { duration: DIALOG_ANIMATION_DURATION * 5, easing: EASING },
        ],
    ],
    container: [
        [
            // Container fade in
            [{ opacity: 0 }, { opacity: 1 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
                pseudoElement: '::before',
            },
        ],
    ],
    headline: [
        [
            // Headline fade in
            [{ opacity: 0 }, { opacity: 0, offset: 0.625 }, { opacity: 1 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
                fill: 'both',
            },
        ],
    ],
    content: [
        [
            // Content fade in
            [{ opacity: 0 }, { opacity: 0, offset: 0.67 }, { opacity: 1 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
                fill: 'both',
            },
        ],
    ],
    actions: [
        [
            // Actions fade in
            [{ opacity: 0 }, { opacity: 0, offset: 0.7 }, { opacity: 1 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
                fill: 'both',
            },
        ],
    ],
}
/**
 * The default dialog close animation.
 */
export const DIALOG_DEFAULT_CLOSE_ANIMATION: DialogAnimation = {
    dialog: [
        [
            // Dialog slides down and fades out simultaneously.
            [
                { transform: 'translateY(0)', opacity: 1 },
                { transform: 'translateY(30%)', opacity: 0 },
            ],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
            },
        ],
        [
            // Dialog scale down
            [{ scale: 1 }, { scale: DIALOG_HIDDEN_SCALE }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
            },
        ],
    ],
    scrim: [
        [
            // Scrim now fades out for 250ms to match the dialog.
            [{ opacity: FINAL_SCRIM_OPACITY }, { opacity: 0 }],
            { duration: DIALOG_ANIMATION_DURATION, easing: EASING },
        ],
    ],
    container: [
        [
            // Container shrinks and fades out together for a seamless effect.
            [{ opacity: 1 }, { opacity: 0 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
                pseudoElement: '::before',
            },
        ],
    ],
    headline: [
        [
            // Headline fades out slightly faster and simultaneously with other content.
            [{ opacity: 1 }, { opacity: 0 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
                fill: 'both',
            },
        ],
    ],
    content: [
        [
            // Content fades out with the headline.
            [{ opacity: 1 }, { opacity: 0 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
                fill: 'both',
            },
        ],
    ],
    actions: [
        [
            // Actions fade out with the rest of the content.
            [{ opacity: 1 }, { opacity: 0 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
                fill: 'both',
            },
        ],
    ],
}

export const FULL_SCREEN_DIALOG_DEFAULT_OPEN_ANIMATION: DialogAnimation = {
    dialog: [
        [
            // Dialog slide up and fade in
            [{ opacity: 0 }, { opacity: 1 }],
            { duration: DIALOG_ANIMATION_DURATION, easing: EASING },
        ],
    ],
    scrim: [
        [
            // Scrim fade in
            [{ opacity: 0 }, { opacity: FINAL_SCRIM_OPACITY }],
            { duration: DIALOG_ANIMATION_DURATION * 5, easing: EASING },
        ],
    ],
    container: [
        [
            // Container fade in
            [{ opacity: 0 }, { opacity: 1 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
                pseudoElement: '::before',
            },
        ],
    ],
    headline: [
        [
            // Headline fade in
            [{ opacity: 0 }, { opacity: 0, offset: 0.625 }, { opacity: 1 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
                fill: 'both',
            },
        ],
    ],
    content: [
        [
            // Content fade in
            [{ opacity: 0 }, { opacity: 0, offset: 0.67 }, { opacity: 1 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
                fill: 'both',
            },
        ],
    ],
    actions: [
        [
            // Actions fade in
            [{ opacity: 0 }, { opacity: 0, offset: 0.7 }, { opacity: 1 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
                fill: 'both',
            },
        ],
    ],
}
/**
 * The default dialog close animation.
 */
export const FULL_SCREEN_DIALOG_DEFAULT_CLOSE_ANIMATION: DialogAnimation = {
    dialog: [
        [
            // Dialog slides down and fades out simultaneously.
            [{ opacity: 1 }, { opacity: 0 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
            },
        ],
    ],
    scrim: [
        [
            // Scrim now fades out for 250ms to match the dialog.
            [{ opacity: FINAL_SCRIM_OPACITY }, { opacity: 0 }],
            { duration: DIALOG_ANIMATION_DURATION, easing: EASING },
        ],
    ],
    container: [
        [
            // Container shrinks and fades out together for a seamless effect.
            [{ opacity: 1 }, { opacity: 0 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
                pseudoElement: '::before',
            },
        ],
    ],
    headline: [
        [
            // Headline fades out slightly faster and simultaneously with other content.
            [{ opacity: 1 }, { opacity: 0 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
                fill: 'both',
            },
        ],
    ],
    content: [
        [
            // Content fades out with the headline.
            [{ opacity: 1 }, { opacity: 0 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
                fill: 'both',
            },
        ],
    ],
    actions: [
        [
            // Actions fade out with the rest of the content.
            [{ opacity: 1 }, { opacity: 0 }],
            {
                duration: DIALOG_ANIMATION_DURATION,
                easing: EASING,
                fill: 'both',
            },
        ],
    ],
}

export const DIALOG_NO_OPEN_ANIMATION: DialogAnimation = {
    dialog: [
        [
            // Dialog slide up and fade in
            [{ opacity: 1 }],
            { duration: 0 },
        ],
    ],
    scrim: [
        [
            // Scrim fade in
            [{ opacity: FINAL_SCRIM_OPACITY }],
            { duration: 0 },
        ],
    ],
    container: [
        [
            // Container fade in
            [{ opacity: 1 }],
            { duration: 0, pseudoElement: '::before' },
        ],
    ],
    headline: [
        [
            // Headline fade in
            [{ opacity: 1 }],
            { duration: 0, fill: 'both' },
        ],
    ],
    content: [
        [
            // Content fade in
            [{ opacity: 1 }],
            { duration: 0, fill: 'both' },
        ],
    ],
    actions: [
        [
            // Actions fade in
            [{ opacity: 1 }],
            { duration: 0, fill: 'both' },
        ],
    ],
}

export const DIALOG_NO_CLOSE_ANIMATION: DialogAnimation = {
    dialog: [
        [
            // Dialog slide down and fade out
            [{ opacity: 0 }],
            { duration: 0 },
        ],
    ],
    scrim: [
        [
            // Scrim fade out
            [{ opacity: 0 }],
            { duration: 0 },
        ],
    ],
    container: [
        [
            // Container fade out
            [{ opacity: 0 }],
            { duration: 0, pseudoElement: '::before' },
        ],
    ],
    headline: [
        [
            // Headline fade out
            [{ opacity: 0 }],
            { duration: 0, fill: 'both' },
        ],
    ],
    content: [
        [
            // Content fade out
            [{ opacity: 0 }],
            { duration: 0, fill: 'both' },
        ],
    ],
    actions: [
        [
            // Actions fade out
            [{ opacity: 0 }],
            { duration: 0, fill: 'both' },
        ],
    ],
}
