import { Button } from '@src/components/Button/index.ts'
import type { CustomIconName } from '@src/components/CustomIcon/icons/icons.ts'
import { CustomIcon } from '@src/components/CustomIcon/index.ts'
import { useEffect, useState } from 'react'
import styles from './Installer.module.scss'

type Os = 'osx' | 'win' | 'android' | 'unsupported'

const OsLogos: PartialRecord<Os, CustomIconName> = {
    osx: 'osxLogo',
    win: 'windowsLogo',
    android: 'androidLogo',
}

const files: Record<Os, Array<string>> = {
    osx: ['/kiosk/DemoKiosk-osx.zip'],
    win: ['/kiosk/DemoKiosk-win.zip'],
    android: [],
    unsupported: [],
}

export const Installer = () => {
    const [os, setOs] = useState<Os>('unsupported')

    useEffect(() => {
        const userAgent = window.navigator.userAgent
        let val: Os = 'unsupported'
        if (userAgent.indexOf('Win') !== -1) {
            val = 'win'
        } else if (userAgent.indexOf('Mac') !== -1) {
            val = 'osx'
        } else if (userAgent.indexOf('Android') !== -1) {
            val = 'android'
        }
        setOs(val)
    }, [])

    const downloadExecutables = (urls: Array<string>) => {
        if (!urls || urls.length === 0) {
            console.log('Installer ERROR: no files to download')
            return
        }
        urls.forEach((url) => {
            const fullUrl =
                url.startsWith('http://') || url.startsWith('https://')
                    ? url
                    : `${window.location.origin}/${url}`
            const link = document.createElement('a')
            link.href = fullUrl
            const urlObject = new URL(fullUrl)
            link.download = String(urlObject.pathname.split('/').pop())
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
        })
    }

    const downloadConfig = (os: Os) => {
        if (os === 'android' || os === 'unsupported') {
            console.log('Installer ERROR: no files to download')
            return
        }

        let content = ''
        let filename = ''
        if (os === 'osx') {
            content = `${window.location.origin}${window.location.pathname}`
            filename = 'DemoKioskConfig.txt'
        } else if (os === 'win') {
            content = ``
            content = `[Settings]\nURL=${window.location.origin}${window.location.pathname}`
            filename = 'DemoKioskConfig.ini'
        }

        const blob = new Blob([content], { type: 'text/plain' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className={styles.installerWrap}>
            {os === 'unsupported' && (
                <div className={styles.unsupported}>No Kiosk installer for your OS</div>
            )}
            {(os === 'win' || os === 'osx') && (
                <Button
                    size='large'
                    iconPosition='left'
                    icon={<CustomIcon icon={OsLogos[os] ?? 'windowsLogo'} />}
                    onClick={() => {
                        downloadExecutables(files[os])
                        downloadConfig(os)
                    }}>
                    Install DemoKiosk
                </Button>
            )}
        </div>
    )
}
