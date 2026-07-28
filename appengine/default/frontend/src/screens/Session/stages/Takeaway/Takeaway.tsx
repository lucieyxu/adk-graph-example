import { useUrls } from '@shared/ts/hooks/useUrls.ts'
import { QrCode } from '@src/components/QrCode/QrCode.tsx'
import { Stage } from '@src/components/Stage/index.tsx'
import { useContent } from '@src/content/index.ts'
import { useSessionManagerStore } from '@src/stores/sessionManagerStore.ts'
import { useSettingsStore } from '@src/stores/settingsStore.ts'
import styles from './Takeaway.module.scss'

export const Takeaway = () => {
    const { locale, eventId } = useSettingsStore()
    const { id } = useSessionManagerStore()
    const urls = useUrls()
    const c = useContent()

    const takeawayUrl = `${urls.appenginePublicFrontend}/?sessionId=${id}&locale=${locale}&eventId=${eventId}`

    return (
        <Stage>
            <div className={styles.stage}>
                <div className={styles.column}>
                    <div className={styles.header}>{c.session.takeaway}</div>
                    <div className={styles.qr}>
                        <QrCode url={takeawayUrl} />
                    </div>
                </div>
            </div>
        </Stage>
    )
}
