import { Stage } from '@src/components/Stage/index.tsx'
import { useTranslation } from '@src/i18n/useTranslation.ts'
import { Clicker } from '@src/screens/Session/stages/Click/Clicker/index.tsx'
import { Counter } from '@src/screens/Session/stages/Click/Counter/index.tsx'
import { Rank } from '@src/screens/Session/stages/Click/Rank/index.tsx'
import styles from './Click.module.scss'

export const Click = () => {
    const t = useTranslation()

    return (
        <Stage>
            <div className={styles.clickStage}>
                <div className={styles.column}>
                    <h1 className={styles.headline}>{t.session.h1}</h1>
                    <Counter />
                    <Clicker />
                    <Rank />
                </div>
            </div>
        </Stage>
    )
}
