import androidLogo from '@public/images/android.svg'
import gLogo from '@public/images/g-logo.svg'
import geminiSpark from '@public/images/gemini-spark-color.svg'
import osxLogo from '@public/images/osx.svg'
import windowsLogo from '@public/images/win.svg'

export const icons = {
    gLogo,
    geminiSpark,
    androidLogo,
    osxLogo,
    windowsLogo,
} as const

export type CustomIconName = keyof typeof icons
