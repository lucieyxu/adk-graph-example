import { MdFilledButton, MdOutlinedButton } from '@shared/ts/lib/material.ts'
import { MdDialog } from '@src/components/MdDialog/index.ts'
import { useContent } from '@src/content/index.ts'
import { useSessionManagerStore } from '@src/stores/sessionManagerStore.ts'
import styles from './SessionNag.module.scss'

export const SessionNag = () => {
    const session = useSessionManagerStore()
    const c = useContent()

    return (
        <>
            <MdDialog
                className={styles.SessionNag}
                open={session.nagState === 'inactive'}
                onClose={() => {}}>
                <div slot='headline'> {c.nag.inactive.headline}</div>
                <div slot='content'>
                    <p> {c.nag.inactive.body}</p>
                </div>
                <div slot='actions'>
                    <MdOutlinedButton
                        onClick={() => {
                            session.setInactive(true)
                        }}>
                        {c.nag.inactive.exit}
                    </MdOutlinedButton>
                    <MdFilledButton
                        onClick={() => {
                            session.setNagState('closed')
                        }}>
                        {c.nag.inactive.continue}
                    </MdFilledButton>
                </div>
            </MdDialog>
            <MdDialog
                className={styles.SessionNag}
                open={session.nagState === 'confirm'}
                onClose={() => {}}>
                <div slot='headline'>{c.nag.confirm.headline}</div>
                <div slot='content'>
                    <p>{c.nag.confirm.body}</p>
                </div>
                <div slot='actions'>
                    <MdOutlinedButton
                        onClick={() => {
                            session.setNagState('closed')
                        }}>
                        {c.nag.confirm.continue}
                    </MdOutlinedButton>
                    <MdFilledButton
                        onClick={() => {
                            session.requestEnd()
                        }}>
                        {c.nag.confirm.exit}
                    </MdFilledButton>
                </div>
            </MdDialog>
        </>
    )
}
