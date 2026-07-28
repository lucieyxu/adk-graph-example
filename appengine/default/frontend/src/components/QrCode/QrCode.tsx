import ReactQrCode from 'react-qr-code'
import styles from './QrCode.module.scss'

interface QrCodeProps {
    url: string
}

export const QrCode = (props: QrCodeProps) => {
    const { url } = props
    const isProd = process.env.NEXT_PUBLIC_ENV === 'prod'
    return (
        <>
            {
                // Make the QR code clickable for dev and staging testing, so you can just open in a new tab
                !isProd && (
                    <div className={styles.QrCodeClickable}>
                        <a href={url} target='_blank'>
                            <ReactQrCode value={url} />
                        </a>
                    </div>
                )
            }
            {
                // But in prod, the QR code must be scanned to load on a separate device
                isProd && (
                    <div className={styles.QrCodeStandard}>
                        <ReactQrCode value={url} />
                    </div>
                )
            }
        </>
    )
}
