import type { ThemeName } from '@shared/ts/colors/index.ts'
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
 * Examples: ?enableHighPerformanceMode=false&enableSounds=true&geminiModelCode=gemini-2.5-flash-preview-05-20&sessionTimeoutSeconds=3600
 */
type SettingsState = {
    isOpen: boolean
    setIsOpen: (isOpen: boolean) => void

    // Performance settings
    enableHighPerformanceMode: boolean
    setEnableHighPerformanceMode: (enabled: boolean) => void
    toggleHighPerformanceMode: () => void

    // Audio settings
    enableSounds: boolean
    setEnableSounds: (enabled: boolean) => void
    toggleSounds: () => void

    // Model settings
    modelOverrides: Record<string, string>
    setModelOverride: (endpoint: string, model: string) => void

    // Prompt settings
    promptOverrides: Record<string, string>
    setPromptOverride: (endpoint: string, prompt: string) => void

    resetAllOverrides: () => void

    // Session settings
    sessionTimeoutSeconds: number
    setSessionTimeoutSeconds: (seconds: number) => void

    // Locale settings
    locale: LanguageCode
    setLocale: (locale: LanguageCode) => void

    // Theme
    theme: ThemeName
    setTheme: (theme: ThemeName) => void

    // Speech recognition settings
    speechContinuous: boolean
    setSpeechContinuous: (continuous: boolean) => void

    // Camera settings
    selectedCameraId: string
    setSelectedCameraId: (id: string) => void
    cameraDevices: { deviceId: string; label: string }[]
    setCameraDevices: (devices: { deviceId: string; label: string }[]) => void
    cameraFacingMode: 'user' | 'environment'
    setCameraFacingMode: (mode: 'user' | 'environment') => void
    cameraMirrored: boolean
    setCameraMirrored: (mirrored: boolean) => void

    // Source for all analytics events to be grouped by (campaign_source for segmenting in GA)
    eventId: string
    setEventId: (eventId: string) => void

    // TODO event id + name ?

    resetToDefaults: () => void
}

// Default values - keep these in sync with the store initialization
const DEFAULT_SETTINGS = {
    isOpen: false,
    enableHighPerformanceMode: true,
    enableSounds: true,
    modelOverrides: {},
    promptOverrides: {},
    sessionTimeoutSeconds: 120, // 2 minutes
    locale: DEFAULT_LANGUAGE,
    eventId: 'default',
    theme: 'default',
    speechContinuous: false,
    selectedCameraId: '',
    cameraFacingMode: 'user',
    cameraMirrored: true,
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
        (set, get) => ({
            // Default settings
            ...DEFAULT_SETTINGS,

            setIsOpen: (isOpen: boolean) => set({ isOpen }),
            setEnableHighPerformanceMode: (enabled) => set({ enableHighPerformanceMode: enabled }),
            toggleHighPerformanceMode: () =>
                set({ enableHighPerformanceMode: !get().enableHighPerformanceMode }),

            enableSounds: DEFAULT_SETTINGS.enableSounds,
            setEnableSounds: (enabled) => set({ enableSounds: enabled }),
            toggleSounds: () => set({ enableSounds: !get().enableSounds }),

            setModelOverride: (endpoint: string, model: string) => {
                const modelOverrides = get().modelOverrides
                if (model) {
                    modelOverrides[endpoint] = model
                } else {
                    delete modelOverrides[endpoint]
                }
                set({ modelOverrides })
            },

            setPromptOverride: (endpoint: string, prompt: string) => {
                const promptOverrides = get().promptOverrides
                if (prompt) {
                    promptOverrides[endpoint] = prompt
                } else {
                    delete promptOverrides[endpoint]
                }
                set({ promptOverrides })
            },

            resetAllOverrides: () => {
                set({ promptOverrides: {}, modelOverrides: {} })
            },

            setSessionTimeoutSeconds: (seconds: number) => set({ sessionTimeoutSeconds: seconds }),

            // Reset all settings to their default values
            resetToDefaults: () =>
                set({
                    ...DEFAULT_SETTINGS,

                    // EXCEPT these
                    isOpen: get().isOpen,
                    promptOverrides: get().promptOverrides,
                    modelOverrides: get().modelOverrides,
                }),
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

            setSpeechContinuous: (speechContinuous) => set({ speechContinuous }),

            selectedCameraId: '',
            setSelectedCameraId: (selectedCameraId) => set({ selectedCameraId }),
            cameraDevices: [],
            setCameraDevices: (cameraDevices) => set({ cameraDevices }),
            cameraFacingMode: 'user',
            setCameraFacingMode: (cameraFacingMode) => set({ cameraFacingMode }),
            cameraMirrored: true,
            setCameraMirrored: (cameraMirrored) => set({ cameraMirrored }),
        }),
        {
            name: `${'__GCP_PROJECT_ID__'}-${process.env.NEXT_PUBLIC_ENV}-settings-storage`,
        },
    ),
)
