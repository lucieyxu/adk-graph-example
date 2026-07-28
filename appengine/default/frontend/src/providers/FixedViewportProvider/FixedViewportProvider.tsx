'use client'

import { useWindowOrientation } from '@src/hooks/useWindowOrientation.ts'
import { type OrientationName, viewport } from '@src/styles/constants.ts'
import cn from 'classnames'
import { useAtom } from 'jotai'
import {
    type CSSProperties as CSS,
    type PropsWithChildren,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react'
import styles from './FixedViewportProvider.module.scss'
import { viewportAtom } from './viewportAtom.ts'

interface FixedViewportProviderProps extends PropsWithChildren {
    mode?: OrientationName | 'auto'
    disabled?: boolean
    letterboxColor?: string
    viewportBackground?: string
    className?: string
    style?: CSS
}

/**
 * FixedViewportProvider is a provider that ensures the viewport is fixed to a certain size.
 * It can be configured to use the window's orientation or to use a specific orientation.
 * It also sets the root font-size such that `1rem = 1px` when the window size matches the viewport size, and scales proportionally otherwise.
 *
 * @param mode - The mode to use for the viewport. 'auto' means to use the window's orientation, use 'landscape' or 'portrait' to force a specific orientation.
 * @param children - The children to render.
 * @param letterboxColor - The color of the letterbox. This can be overridden by setting the `--letterbox-background` CSS variable in the tree above the element.
 * @param viewportBackground - The background color of the viewport. This can be overridden by setting the `--viewport-background` CSS variable in the tree above the element.
 * @param className - The class name to apply to the viewport.
 */
export const FixedViewportProvider = ({
    mode = 'auto',
    children,
    letterboxColor = 'var(--md-sys-color-surface-container-lowest)',
    viewportBackground = 'var(--md-sys-color-background)',
    disabled,
    className,
    style,
}: FixedViewportProviderProps) => {
    const [container, setContainer] = useState<HTMLDivElement | null>(null)
    const containerRefCallback = useCallback((node: HTMLDivElement | null) => {
        setContainer(node)
    }, [])

    const viewportRef = useRef<HTMLDivElement>(null)

    const _orientation = useWindowOrientation()
    const orientation = mode === 'auto' ? _orientation : mode
    const [{ width, height }, setViewport] = useAtom(viewportAtom)

    useEffect(() => {
        setViewport({
            orientation,
            container,
            width: viewport[orientation].width,
            height: viewport[orientation].height,
        })
    }, [orientation, setViewport, container])

    useEffect(() => {
        const resizeHandler = () => {
            if (disabled) {
                const fontSize = 0.015
                document.documentElement.style.setProperty('font-size', `${fontSize}rem`)
                return
            }

            const windowAspectRatio = window.innerWidth / window.innerHeight
            const siteAspectRatio = width / height

            const widerThanViewport = windowAspectRatio < siteAspectRatio

            const fontSizeBase = 100 / width
            const fontSize = fontSizeBase * (widerThanViewport ? 1 : siteAspectRatio)

            const unit = widerThanViewport ? 'svw' : 'svh'
            document.documentElement.style.setProperty('font-size', `${fontSize}${unit}`)

            // OFFSET inner viewport from outer window
            if (widerThanViewport && viewportRef.current) {
                const scale = window.innerWidth / width
                viewportRef.current.style.top = `${0.5 * (window.innerHeight - height * scale)}px`
                viewportRef.current.style.left = '0px'
            } else if (viewportRef.current) {
                const scale = window.innerHeight / height
                viewportRef.current.style.top = '0px'
                viewportRef.current.style.left = `${0.5 * (window.innerWidth - width * scale)}px`
            }
        }
        resizeHandler()
        window.addEventListener('resize', resizeHandler)
        return () => {
            window.removeEventListener('resize', resizeHandler)
            document.documentElement.style.removeProperty('font-size')
        }
    }, [width, height, disabled])

    const activeStyle = {
        '--internal-letterbox-background': letterboxColor,
        '--internal-viewport-background': viewportBackground,
        '--viewport-width': width,
        '--viewport-height': height,
    }

    const inactiveStyle = {
        position: 'absolute',
        inset: 0,
    }

    return (
        <div
            style={(disabled ? inactiveStyle : activeStyle) as CSS}
            className={styles.fixedViewportWrapper}>
            <div
                className={cn(styles.fixedViewport, className)}
                ref={viewportRef}
                style={(disabled ? inactiveStyle : {}) as CSS}
                data-orientation={disabled ? '' : orientation}>
                <div ref={containerRefCallback} style={style}>
                    {children}
                </div>
            </div>
        </div>
    )
}
