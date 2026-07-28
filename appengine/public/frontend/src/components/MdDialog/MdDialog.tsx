import type { DialogAnimation } from '@material/web/dialog/internal/animations'
import { MdDialogBase, type WebComponentMdDialog } from '@shared/ts/lib/material.ts'
import { mergeRefs } from '@shared/ts/lib/mergeRefs.ts'
import { mergeToClone } from '@shared/ts/lib/mergeToClone.ts'
import classNames from 'classnames'
import { forwardRef, type Ref, useCallback, useEffect, useMemo, useRef } from 'react'
import {
    DIALOG_DEFAULT_CLOSE_ANIMATION,
    DIALOG_DEFAULT_OPEN_ANIMATION,
    DIALOG_NO_CLOSE_ANIMATION,
    DIALOG_NO_OPEN_ANIMATION,
    FULL_SCREEN_DIALOG_DEFAULT_CLOSE_ANIMATION,
    FULL_SCREEN_DIALOG_DEFAULT_OPEN_ANIMATION,
} from './animation.ts'
import styles from './MdDialog.module.scss'

export interface DialogProps extends React.HTMLAttributes<HTMLDialogElement> {
    open: boolean
    /**
     * @param e - Because the dialog can close itself, you are required to pass a callback to listen
     * for when the dialog has been closed -- otherwise the controlling state will become out of sync.
     */
    onClose: (e: WebComponentMdDialog | null) => void
    onOpen?: (e: WebComponentMdDialog | null) => void
    ref?: Ref<WebComponentMdDialog>
    fullScreen?: boolean
    children: React.ReactNode
    customOpenAnimation?: DialogAnimation
    customCloseAnimation?: DialogAnimation
    quick?: boolean
}

/**
 * Material Web Dialog component.
 *
 * @prop {boolean}         open - Whether the dialog is open
 * @prop {function}        onClose - Additional handler for the close event
 * @prop {function}        onOpen - Additional handler for the open event
 * @prop {boolean}         fullScreen - Whether the dialog is full screen
 * @prop {React.ReactNode} children - The children of the dialog
 * @prop {string}          className - The class name of the dialog
 * @prop {DialogAnimation} customOpenAnimation - The custom open animation
 * @prop {DialogAnimation} customCloseAnimation - The custom close animation
 * @prop {Ref<WebComponentMdDialog>} ref - The ref of the dialog
 * @prop {boolean}         quick - This renders no animation for low power mode, this should only be used for storybook
 *
 * @see https://github.com/material-components/material-web/blob/main/docs/components/dialog.md
 */

const enableHighPerformanceMode = true

export const MdDialog = forwardRef<WebComponentMdDialog, DialogProps>(
    (
        {
            className,
            open,
            onClose,
            onOpen,
            customOpenAnimation,
            customCloseAnimation,
            fullScreen,
            children,
            ...props
        }: DialogProps,
        ref: Ref<WebComponentMdDialog>,
    ) => {
        const dialogRef = useRef<WebComponentMdDialog>(null)
        const isOpenRef = useRef(false)
        useEffect(() => {
            if (open && !isOpenRef.current) {
                dialogRef.current?.show()
                onOpen?.(dialogRef.current)
            } else if (!open && isOpenRef.current) {
                dialogRef.current?.close()
                onClose?.(dialogRef.current)
            }

            if (open !== isOpenRef.current) isOpenRef.current = open
        }, [open, onClose, onOpen])

        // Get the current animation and merge it with the custom animation
        const animationProps = useMemo(
            () =>
                enableHighPerformanceMode
                    ? {
                          getOpenAnimation: () =>
                              mergeToClone(
                                  customOpenAnimation ?? {},
                                  fullScreen
                                      ? FULL_SCREEN_DIALOG_DEFAULT_OPEN_ANIMATION
                                      : DIALOG_DEFAULT_OPEN_ANIMATION,
                              ),
                          getCloseAnimation: () =>
                              mergeToClone(
                                  customCloseAnimation ?? {},
                                  fullScreen
                                      ? FULL_SCREEN_DIALOG_DEFAULT_CLOSE_ANIMATION
                                      : DIALOG_DEFAULT_CLOSE_ANIMATION,
                              ),
                      }
                    : {
                          getOpenAnimation: () => DIALOG_NO_OPEN_ANIMATION,
                          getCloseAnimation: () => DIALOG_NO_CLOSE_ANIMATION,
                      },
            [customOpenAnimation, customCloseAnimation, fullScreen],
        )

        const setRef = useCallback(
            (node: WebComponentMdDialog | null) => {
                dialogRef.current = node
                // handle situations where the dialog "closes itself" (aka the scrim was clicked)
                node?.addEventListener('close', () => {
                    if (isOpenRef.current) onClose?.(dialogRef.current)
                    isOpenRef.current = false
                })
            },
            [onClose],
        )

        const mergedRef = useMemo(() => mergeRefs(ref, setRef), [ref, setRef])

        return (
            <MdDialogBase
                className={classNames(styles.dialog, fullScreen && styles.fullScreen, className)}
                ref={mergedRef}
                {...animationProps}
                quick={props.quick || !enableHighPerformanceMode}>
                {children}
            </MdDialogBase>
        )
    },
)

MdDialog.displayName = 'MdDialog'
