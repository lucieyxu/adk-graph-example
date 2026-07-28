import { Button } from '@src/components/Button/index.ts'
import { useSessionFirestore } from '@src/hooks/useSessionFirestore.ts'
import { useTranslation } from '@src/i18n/useTranslation.ts'
import styles from './Clicker.module.scss'

export const Clicker = () => {
    const t = useTranslation()

    const firestore = useSessionFirestore()

    const incrementClicks = () => {
        const task = async () => {
            if (!firestore?.setData) return
            await firestore.setData((data) => {
                return {
                    ...data,
                    score: data.score + 1,
                }
            })
        }

        task()
    }

    return (
        <Button className={styles.clicker} color='blue' onClick={incrementClicks} icon='heart_plus'>
            {t.session.clickMe}
        </Button>
    )
}
