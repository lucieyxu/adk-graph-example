// import type { Template as T } from '@src/i18n/Template.ts'

export type Translation = {
    _meta: {
        name: string
        languageCode: string
        label: string
        writtenVariant: 'normal' | 'Traditional Chinese' | 'Simplified Chinese'
    }
    settings: {
        promptOverride: string
        modelOverride: string
        promptAndModelOverride: string
        resetOverrideCta: string
        viewOverridesCta: string
    }
    nag: {
        inactive: {
            headline: string
            body: string
            exit: string
            continue: string
        }
        confirm: {
            headline: string
            body: string
            exit: string
            continue: string
        }
    }
    home: {
        h1: string
        cta: string
    }
    vacant: {
        h1: string
        h2: string
    }
    session: {
        h1: string
        clickMe: string
        end: string
        takeaway: string
        yourRank: string
    }
}
