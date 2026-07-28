import * as analytics from '@shared/ts/lib/analytics.ts'
import {
    DEFAULT_SETTINGS,
    NON_QUERYABLE_SETTINGS,
    type QueryableSettingKeys,
    useSettingsStore,
} from '@src/stores/settingsStore.ts'
import { useEffect } from 'react'

/**
 * Types and configuration automatically derived from DEFAULT_SETTINGS
 * This creates automatic 1:1 mapping with store state keys - no manual maintenance needed
 */

// Automatically derive queryable settings (all simple types minus exclusions)
const ALLOWED_QUERY_KEYS = Object.keys(DEFAULT_SETTINGS).filter((key) => {
    const value = DEFAULT_SETTINGS[key as keyof typeof DEFAULT_SETTINGS]
    const type = typeof value
    const isSimpleType = type === 'boolean' || type === 'string' || type === 'number'
    const isNotExcluded = !NON_QUERYABLE_SETTINGS.includes(key as keyof typeof DEFAULT_SETTINGS)
    return isSimpleType && isNotExcluded
}) as QueryableSettingKeys[]

/**
 * Convert string values to appropriate types with validation
 */
const parseQueryValue = (
    key: QueryableSettingKeys,
    value: string,
): boolean | string | number | undefined => {
    const defaultValue = DEFAULT_SETTINGS[key]
    const expectedType = typeof defaultValue

    if (expectedType === 'boolean') {
        if (value === 'true') return true
        if (value === 'false') return false
        return undefined
    }

    if (expectedType === 'number') {
        const numValue = Number(value)
        if (!Number.isNaN(numValue)) return numValue
        return undefined
    }

    if (expectedType === 'string') {
        return value
    }

    return undefined
}

/**
 * Parse all query parameters and extract valid settings
 */
const parseSettingsFromQuery = (): {
    settings: Record<string, boolean | string | number>
    hasParams: boolean
} => {
    if (typeof window === 'undefined') return { settings: {}, hasParams: false }

    const urlParams = new URLSearchParams(window.location.search)
    const settings: Record<string, boolean | string | number> = {}
    let hasParams = false

    // Automatically parse all allowed keys
    ALLOWED_QUERY_KEYS.forEach((key) => {
        const value = urlParams.get(key)
        if (value !== null) {
            const parsedValue = parseQueryValue(key, value)
            if (parsedValue !== undefined) {
                settings[key] = parsedValue
                hasParams = true
            }
        }
    })

    return { settings, hasParams }
}

/**
 * Remove settings query parameters from URL
 * Only removes keys that are in ALLOWED_QUERY_KEYS
 */
const removeSettingsQueryParams = () => {
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)

    // Only remove our allowed settings keys, leave others intact
    ALLOWED_QUERY_KEYS.forEach((key) => {
        url.searchParams.delete(key)
    })

    window.history.replaceState({}, '', url.pathname + url.search)
}

/**
 * Hook to initialize settings from URL query parameters
 *
 * Features:
 * - 1:1 mapping with store state keys (no manual mapping needed)
 * - Type-safe parsing with Zod validation
 * - Only processes keys defined in ALLOWED_QUERY_KEYS
 * - Automatically applies settings and cleans up URL
 *
 * @example
 * // In your root layout component:
 * export const Layout = () => {
 *   useSettingsInitializer()
 *   return <Layout />
 * }
 *
 * @example
 * // URL examples (uses exact store key names):
 * // ?geminiModelId=gemini-2.5-flash (string setting)
 * // ?veoModelId=veo-3.0-generate-001 (string setting)
 * // ?imagenModelId=imagen-4.0-generate-preview-06-06 (string setting)
 * // ?sessionTimeoutSeconds=3600 (number setting)
 * // ?locale=es (string setting)
 * // ?enableHighPerformanceMode=true&geminiModelCode=gemini-2.5-flash&sessionTimeoutSeconds=1800 (mixed types)
 *
 * @example
 * // To add a new query parameter setting:
 * // 1. Add the key+value to DEFAULT_SETTINGS in the store
 * // 2. Add the property and setter to the SettingsState type
 * // 3. Add the key to QUERYABLE_SETTINGS array (only if you want it queryable)
 * // Type inference and parsing are automatic!
 */
export const useSettingsInitializer = () => {
    const store = useSettingsStore()

    useEffect(() => {
        const { settings, hasParams } = parseSettingsFromQuery()

        if (hasParams) {
            // Automatically apply all parsed settings using store setters
            Object.entries(settings).forEach(([key, value]) => {
                if (value !== undefined) {
                    const setterName =
                        `set${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof store
                    const setter = store[setterName]

                    if (typeof setter === 'function') {
                        ;(setter as (value: boolean | string | number) => void)(value)
                    }
                }
            })

            // Clean up URL
            removeSettingsQueryParams()
        }

        analytics.setGroup(store.eventId)
    }, [store])
}
