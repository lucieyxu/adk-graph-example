import type { Translation } from '@src/i18n/Translation.ts'

const translation: Translation = {
    _meta: {
        name: 'English',
        languageCode: 'en-US',
        label: 'English',
        writtenVariant: 'normal',
    },
    home: {
        h1: 'Welcome to Public __PROJECT_NAME__!',
        cta: 'See your results',
    },
    error: {
        h1: 'Sorry!',
        h2: 'No data was found.',
    },
    session: {
        h1: 'Your stats',
        yourScore: 'Your score',
        yourRank: 'Your rank',
        image: 'Your image',
        end: 'End',
        visualize: 'Your image creation',
    },
}

export default translation
