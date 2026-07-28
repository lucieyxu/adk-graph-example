'use client'

import { useSettingsInitializer } from '@src/hooks/useSettingsInitializer.ts'

/**
 * This provider is a client component wrapper for the useSettingsInitializer hook for use within server components.
 */
export const SettingsInitializerProvider = () => {
    useSettingsInitializer()
    return null
}
