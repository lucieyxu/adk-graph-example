import { useEffect, useState } from 'react'
import styles from './Colors.module.scss'

interface SwatchProps {
    color: string
    label: string
    jsAccess: string
    cssAccess: string
    rgbAccess: string
}

export const Swatch = ({ color, label, jsAccess, cssAccess, rgbAccess }: SwatchProps) => {
    const [copied, setCopied] = useState<'js' | 'css' | 'rgb' | null>(null)

    useEffect(() => {
        if (copied) {
            const timeout = window.setTimeout(() => setCopied(null), 2000)
            return () => clearTimeout(timeout)
        }
    }, [copied])

    const buttons = [
        {
            label: 'JS',
            access: jsAccess,
            copied: copied === 'js',
            setCopied: () => setCopied('js'),
        },
        {
            label: 'CSS',
            access: cssAccess,
            copied: copied === 'css',
            setCopied: () => setCopied('css'),
        },
        {
            label: 'CSS(rgb)',
            access: rgbAccess,
            copied: copied === 'rgb',
            setCopied: () => setCopied('rgb'),
        },
    ]

    return (
        <div
            className={styles.swatch}
            style={{
                backgroundColor: color,
                border: color === 'rgb(0, 0, 0)' ? '1px solid var(--gray-900)' : 'none',
            }}>
            <div className={styles.colorLabel} onMouseLeave={() => setCopied(null)}>
                <span className={styles.main}>{label}</span>
                <div className={styles.tooltip}>
                    {buttons.map(({ label, access, copied, setCopied }) => (
                        <button
                            type='button'
                            onClick={() => {
                                navigator.clipboard.writeText(access)
                                setCopied()
                            }}
                            title={access}
                            data-copied={copied}
                            className={styles.textLabelMono}>
                            <span className={styles.buttonText}>
                                <span className={styles.header4Mono}>⎘</span> {label}
                            </span>
                            <span className={styles.buttonCopied} aria-label='Copied' role='img'>
                                ✓
                            </span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}
