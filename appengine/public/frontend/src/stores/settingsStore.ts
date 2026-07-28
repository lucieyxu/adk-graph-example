import type { ThemeName } from '@shared/ts/colors/index.ts'
import * as analytics from '@shared/ts/lib/analytics.ts'
import { DEFAULT_LANGUAGE, LANGUAGE_CODES, type LanguageCode } from '@src/i18n/locales.ts'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Settings Store
 *
 * This store manages application settings with localStorage persistence.
 *
 * Want to set settings via URL query parameters?
 * See: @src/hooks/useSettingsInitializer for URL query parameter support
 * Examples: ?locale=es_US&
 */

const NON_PERSISTED_KEYS: Array<keyof SettingsState> = ['sessionId'] as const
type NonPersistedKey = (typeof NON_PERSISTED_KEYS)[number]

export type SettingsState = {
    sessionId: string
    setSessionId: (sessionId: string) => void

    // Locale settings
    locale: LanguageCode
    setLocale: (locale: LanguageCode) => void

    // Theme
    theme: ThemeName
    setTheme: (theme: ThemeName) => void

    // Source for all analytics events to be grouped by (campaign_source for segmenting in GA)
    eventId: string
    setEventId: (eventId: string) => void

    resetToDefaults: () => void
}

// Default values - keep these in sync with the store initialization
const DEFAULT_SETTINGS = {
    sessionId: '',
    locale: DEFAULT_LANGUAGE,
    eventId: 'default',
    theme: 'default',
} as const satisfies Partial<SettingsState>

/**
 * Configuration: which settings should NOT be queryable via URL parameters
 *
 * NOTE: Complex objects, arrays, functions are automatically excluded — no need to add them here
 * Only add simple types (boolean, string, number) that you want to exclude from query params
 *
 * Examples of what to add here:
 * - Internal flags: 'debugMode', 'internalFlag'
 * - Long strings (e.g. a text prompt)'
 */
export const NON_QUERYABLE_SETTINGS: (keyof typeof DEFAULT_SETTINGS)[] = [
    // Add simple types here that should NOT be settable via query params
    // Complex objects are automatically excluded
]

// Export types for query parameter usage
export type QueryableSettingKeys = keyof typeof DEFAULT_SETTINGS
export { DEFAULT_SETTINGS }

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set) => ({
            // Default settings
            ...DEFAULT_SETTINGS,

            setSessionId: (sessionId) => {
                analytics.setSessionId(sessionId)
                return set({ sessionId })
            },

            setLocale: (locale) => {
                // check if the locale is valid
                if (!LANGUAGE_CODES.includes(locale)) {
                    console.error(`Invalid locale: ${locale}, fallback to ${DEFAULT_LANGUAGE}`)
                    locale = DEFAULT_LANGUAGE
                }
                set({ locale })
                document.documentElement.lang = locale.split('_')[0] ?? 'en'
            },

            setTheme: (theme) => set({ theme }),

            setEventId: (eventId) => set({ eventId }),

            // Reset all settings to their default values
            resetToDefaults: () => set(DEFAULT_SETTINGS),
        }),
        {
            name: `${process.env.NEXT_PUBLIC_GCP_PROJECT_ID}-${process.env.NEXT_PUBLIC_ENV}-settings-storage-public`,
            // EXCLUDE non-persisted keys from being written to local storage
            partialize: (state) =>
                Object.fromEntries(
                    Object.entries(state).filter(
                        ([key]) => !NON_PERSISTED_KEYS.includes(key as NonPersistedKey),
                    ),
                ),
        },
    ),
)
