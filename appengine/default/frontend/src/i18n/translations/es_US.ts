import type { Translation } from '@src/i18n/Translation.ts'

const translation: Translation = {
    _meta: {
        name: 'Spanish',
        languageCode: 'es-US',
        label: 'Español',
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
            headline: '¿Sigues ahí?',
            body: 'Esta sesión se reiniciará pronto.',
            exit: 'Salir',
            continue: 'Continuar',
        },
        confirm: {
            headline: '¿Seguro que ya terminaste?',
            body: 'Perderás los datos de esta sesión.',
            exit: 'Salir',
            continue: 'Continuar',
        },
    },
    home: {
        h1: '¡Bienvenido a la __PROJECT_NAME__!',
        cta: 'Comenzar',
    },
    vacant: {
        h1: '¡Lo siento!',
        h2: 'Esta demostración no está disponible temporalmente.',
    },
    session: {
        h1: '¿Cuantas veces puedes hacer clic?',
        clickMe: '¡Haz clic en mí!',
        yourRank: 'Tu rango',
        end: 'Fin',
        takeaway: 'Escanee para obtener su comida para llevar personalizada.',
    },
}

export default translation
