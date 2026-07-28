import gLogo from '@public/images/g-logo.svg'
import geminiSpark from '@public/images/gemini-spark-color.svg'

export const icons = {
    gLogo,
    geminiSpark,
} as const

export type CustomIconName = keyof typeof icons
