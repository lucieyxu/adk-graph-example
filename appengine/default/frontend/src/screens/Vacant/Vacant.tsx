'use client'

import { ScreenTransition } from '@src/components/ScreenTransition/ScreenTransition.tsx'
import { useTranslation } from '@src/i18n/useTranslation.ts'
import style from './vacant.module.scss'

export const Vacant = () => {
    const t = useTranslation()
    return (
        <ScreenTransition>
            <div className={style.vacant}>
                {t.vacant.h1}
                {t.vacant.h2}
            </div>
        </ScreenTransition>
    )
}
