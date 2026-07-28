import { useUrls } from '@shared/ts/hooks/useUrls.ts'
import { gcsUriToReadUrl } from '@shared/ts/lib/storage.ts'
import { Stage } from '@src/components/Stage/index.tsx'
import { useContent } from '@src/content/index.ts'
import { useSessionFirestore } from '@src/hooks/useSessionFirestore.ts'
import styles from './Visualize.module.scss'

export const Visualize = () => {
    const urls = useUrls()
    const firestore = useSessionFirestore()
    const c = useContent()
    const allImages = firestore.data?.images ?? []
    const imageResult = gcsUriToReadUrl(
        allImages[Math.max(0, allImages.length - 1)] ?? '',
        urls.appenginePublicBackend,
    )

    return (
        <Stage>
            <div className={styles.stage}>
                <div className={styles.column}>
                    <div className={styles.header}>{c.session.visualize}</div>
                    <div className={styles.imageWrapper}>
                        <img
                            src={imageResult && imageResult !== '' ? imageResult : undefined}
                            alt={`user generated content`}
                        />
                    </div>
                </div>
            </div>
        </Stage>
    )
}
