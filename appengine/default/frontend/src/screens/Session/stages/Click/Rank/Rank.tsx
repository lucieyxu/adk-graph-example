import { useRank } from '@src/hooks/useRank.ts'
import { useSessionFirestore } from '@src/hooks/useSessionFirestore.ts'
import { useTranslation } from '@src/i18n/useTranslation.ts'
import { useSessionManagerStore } from '@src/stores/sessionManagerStore.ts'
import styles from './Rank.module.scss'

export const Rank = () => {
    const sessionFirestore = useSessionFirestore()
    const { id } = useSessionManagerStore()
    const rank = useRank({ sessionId: id, dependencies: [sessionFirestore.data?.score] })
    const t = useTranslation()

    return (
        <h1 className={styles.rank}>
            <div className={styles.value}>{t.session.yourRank}</div>
            <div className={styles.value}>
                {rank?.rank ?? '--'} / {rank?.total ?? '--'}
            </div>
        </h1>
    )
}
