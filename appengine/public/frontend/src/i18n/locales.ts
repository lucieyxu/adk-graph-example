import translations from './translations/index.ts'

export type LanguageCode = keyof typeof translations
export const LANGUAGE_CODES = Object.keys(translations) as LanguageCode[]

export const LANGUAGES = LANGUAGE_CODES.map((languageCode) => {
    const t = translations[languageCode]
    return {
        ...t._meta,
        languageCode: languageCode.replaceAll('-', '_') as LanguageCode,
    }
})

export const LANGUAGE_LABELS = LANGUAGE_CODES.map((languageCode) => {
    const t = translations[languageCode]
    return t._meta.label
})

export const DEFAULT_LANGUAGE: LanguageCode = 'en_US'
