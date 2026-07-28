import { useSettingsStore } from '@src/stores/settingsStore.ts'
import translations from './translations/index.ts'

export const useTranslation = () => {
    const locale = useSettingsStore((state) => state.locale)

    const t = translations[locale]

    return t
}
