import { mergeToClone } from '@shared/ts/lib/mergeToClone.ts'
import { useTranslation } from '@src/i18n/useTranslation.ts'
import { useMemo } from 'react'
import type { VisualContent } from './types.ts'

/**
 * Non-translatable content for the site (images, icons, etc.)
 *
 * Please update the {@link VisualContent} interface first when adding new content.
 */
export const visualContent: VisualContent = {
    home: {
        icon: 'geminiSpark',
    },
}

/**
 * Provides access to all visual and translated content for the site.
 */
export const useContent = () => {
    const t = useTranslation()
    return useMemo(() => mergeToClone(visualContent, t), [t])
}

export type { VisualContent }
