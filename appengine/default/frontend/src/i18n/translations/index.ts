/** biome-ignore-all lint/style/useNamingConvention: hybrid snake and constant case */

//
// IMPORT new language modules here...
//
import en_US from './en_US.ts'
import es_US from './es_US.ts'

const translations = {
    en_US,
    es_US,
    //
    // AND RE-EXPORT here...
    //
} as const

export default translations
