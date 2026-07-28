import { Stage } from '@src/components/Stage/index.tsx'
import { useContent } from '@src/content/index.ts'
import { useRank } from '@src/hooks/useRank.ts'
import { useSessionFirestore } from '@src/hooks/useSessionFirestore.ts'
import { useSettingsStore } from '@src/stores/settingsStore.ts'
import styles from './Clicks.module.scss'

export const Clicks = () => {
    const firestore = useSessionFirestore()
    const c = useContent()
    const { sessionId } = useSettingsStore()
    const rank = useRank({ sessionId, dependencies: [firestore.data?.score] })

    return (
        <Stage>
            <div className={styles.stage}>
                <div className={styles.column}>
                    <div className={styles.clicksModule}>
                        <div className={styles.label}>{c.session.yourScore}</div>
                        <div className={styles.value}>{firestore?.data?.score}</div>
                    </div>
                    <div className={styles.clicksModule}>
                        <div className={styles.label}>{c.session.yourRank}</div>
                        <div className={styles.label}>
                            {rank?.rank ?? '--'} / {rank?.total ?? '--'}
                        </div>
                    </div>
                </div>
            </div>
        </Stage>
    )
}
