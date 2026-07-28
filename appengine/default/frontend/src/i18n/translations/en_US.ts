import type { Translation } from '@src/i18n/Translation.ts'

const translation: Translation = {
    _meta: {
        name: 'English',
        languageCode: 'en-US',
        label: 'English',
        writtenVariant: 'normal',
    },
    settings: {
        promptOverride: 'Some prompt(s) are currently overriden by your settings.',
        modelOverride: 'Some model(s) are currently overriden by your settings.',
        promptAndModelOverride:
            'Some prompt(s) and model(s) are currently overriden by your settings.',
        resetOverrideCta: 'Reset',
        viewOverridesCta: 'Edit',
    },
    nag: {
        inactive: {
            headline: 'Are you still there?',
            body: 'This session will reset shortly.',
            exit: 'Exit',
            continue: 'Continue',
        },
        confirm: {
            headline: 'Are you sure you are all done?',
            body: 'You will lose the data from this session.',
            exit: 'Exit',
            continue: 'Continue',
        },
    },
    home: {
        h1: 'Welcome to __PROJECT_NAME__!',
        cta: 'Begin',
    },
    vacant: {
        h1: 'Sorry!',
        h2: 'This demo is temporarily unavailable.',
    },
    session: {
        h1: 'Increase your score!',
        clickMe: 'Click',
        yourRank: 'Your rank',
        end: 'End',
        takeaway: 'Scan for your personalized takeaway.',
    },
}

export default translation
