import { useSettingsStore } from '@src/stores/settingsStore.ts'
import { useEffect } from 'react'

export const ThemeProvider = () => {
    const { theme } = useSettingsStore()

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    return null
}
