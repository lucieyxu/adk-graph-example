'use client'

import { useSettingsStore } from '@src/stores/settingsStore.ts'
import { MotionConfig, MotionGlobalConfig } from 'framer-motion'
import { type PropsWithChildren, useEffect, useState } from 'react'

interface HighPerformanceProviderProps extends PropsWithChildren {
    /**
     * Allows you to pass in a value that will override the `enableHighPerformanceMode` setting coming from the settings store.
     */
    override?: boolean
}

export const HighPerformanceProvider = ({ children, override }: HighPerformanceProviderProps) => {
    const { enableHighPerformanceMode: _enableHighPerformanceMode } = useSettingsStore()

    const enableHighPerformanceMode =
        typeof override === 'boolean' ? override : _enableHighPerformanceMode

    const [renderChildren, setRenderChildren] = useState(false)

    // TOGGLE animations based on config
    MotionGlobalConfig.skipAnimations = !enableHighPerformanceMode
    useEffect(() => {
        MotionGlobalConfig.skipAnimations = !enableHighPerformanceMode

        // Temporarily unmount and remount children to make sure the new motion setting
        // is applied to components that were mounted before the change.
        setRenderChildren(false)
        const raf = window.requestAnimationFrame(() => setRenderChildren(true))
        return () => window.cancelAnimationFrame(raf)
    }, [enableHighPerformanceMode])

    return (
        <MotionConfig reducedMotion={enableHighPerformanceMode ? 'never' : 'always'}>
            {renderChildren && children}
        </MotionConfig>
    )
}
