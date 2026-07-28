// import type { Template as T } from '@src/i18n/Template.ts'

export type Translation = {
    _meta: {
        name: string
        languageCode: string
        label: string
        writtenVariant: 'normal' | 'Traditional Chinese' | 'Simplified Chinese'
    }
    home: {
        h1: string
        cta: string
    }
    error: {
        h1: string
        h2: string
    }
    session: {
        h1: string
        image: string
        end: string
        visualize: string
        yourScore: string
        yourRank: string
    }
}
