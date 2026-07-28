import type { Translation } from '@src/i18n/Translation.ts'

const translation: Translation = {
    _meta: {
        name: 'Spanish',
        languageCode: 'es-US',
        label: 'Español',
        writtenVariant: 'normal',
    },
    home: {
        h1: '¡Bienvenido a la Public __PROJECT_NAME__!',
        cta: 'Ver tus resultados',
    },
    error: {
        h1: '¡Lo sentimos!',
        h2: 'No se encontraron datos.',
    },
    session: {
        h1: 'Tus estadísticas',
        yourScore: 'Tus puntaje',
        yourRank: 'Tu rango',
        image: 'Tu imagen',
        end: 'End',
        visualize: 'Tu creación de imágenes',
    },
}

export default translation
