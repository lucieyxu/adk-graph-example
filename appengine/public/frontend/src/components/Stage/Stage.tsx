import { StageTransition } from '@src/components/StageTransition/StageTransition.tsx'
import type { PropsWithChildren } from 'react'
import styles from './Stage.module.scss'

interface StageProps extends PropsWithChildren {
    // active: boolean
}

export const Stage = ({ children }: StageProps) => {
    return (
        <StageTransition>
            <div className={styles.stageContainer}>{children}</div>
        </StageTransition>
    )
}
