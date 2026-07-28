import { useSessionFirestore } from '@src/hooks/useSessionFirestore.ts'
import styles from './Counter.module.scss'

export const Counter = () => {
    const firestore = useSessionFirestore({
        select: (data) => data.score,
    })

    const count = firestore.data ? firestore.data : 0

    return <div className={styles.counter}>{count}</div>
}
