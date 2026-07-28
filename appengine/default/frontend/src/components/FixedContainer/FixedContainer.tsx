'use client'

import { viewport } from '@src/styles/constants.ts'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import styles from './FixedContainer.module.scss'

const orientations = {
    landscape: {
        landscape: true,
        portrait: false,
    },
    portrait: {
        landscape: false,
        portrait: true,
    },
    responsive: {
        landscape: true,
        portrait: true,
    },
} as const

interface FixedContainerProps {
    children: ReactNode
    letterboxColor: string
    orientation: keyof typeof orientations
}

const resolutions = {
    portrait: {
        ...viewport.portrait,
        label: 'portrait',
    },
    landscape: {
        ...viewport.landscape,
        label: 'landscape',
    },
} as const

export const FixedContainer = (props: FixedContainerProps) => {
    const { orientation, letterboxColor } = props
    const currentOrientation = orientations[orientation]

    const containerRef = useRef<HTMLDivElement>(null)
    const [initialized, setInitialized] = useState(false)
    const intializing = useRef(false)
    const getResolution = () => {
        const taller = window.innerHeight > window.innerWidth
        const isPortrait = (taller && currentOrientation.portrait) || !currentOrientation.landscape
        return resolutions[isPortrait ? 'portrait' : 'landscape']
    }

    // RESIZE to maintain 4K resolution of virtual viewport
    const resizerHandler = () => {
        if (!containerRef.current) return

        const vh = window.innerHeight * 0.01
        document.documentElement.style.setProperty('--vh', `${vh}px`)

        const resolution = getResolution()

        containerRef.current.style.width = `${resolution.width}px`
        containerRef.current.style.height = `${resolution.height}px`
        if (resolution.label === 'portrait') {
            containerRef.current.classList.remove('landscape')
        } else {
            containerRef.current.classList.remove('portrait')
        }
        containerRef.current.classList.add(resolution.label)

        const fillWidth =
            resolution.height / resolution.width < window.innerHeight / window.innerWidth

        // RESIZE main container, and center within viewport
        if (fillWidth) {
            const scale = window.innerWidth / resolution.width
            const y = Math.max(0, 0.5 * (window.innerHeight - scale * resolution.height))
            document.documentElement.style.setProperty('--scale', `${scale * 10.0}`)
            containerRef.current.style.transform = `translate(0px, ${y}px) scale(${scale})`
        } else {
            const scale = window.innerHeight / resolution.height
            const x = Math.max(0, 0.5 * (window.innerWidth - scale * resolution.width))
            document.documentElement.style.setProperty('--scale', `${scale * 10.0}`)
            containerRef.current.style.transform = `translate(${x}px, 0px) scale(${scale})`
        }
    }

    useEffect(() => {
        const task = async () => {
            resizerHandler()
            window.addEventListener('resize', resizerHandler)
            setInitialized(true)
        }

        if (!intializing.current) {
            intializing.current = true
            task()
        }
    })

    return (
        <div className={styles.FixedContainerOuter} style={{ backgroundColor: letterboxColor }}>
            <div ref={containerRef} className={styles.FixedContainer}>
                {initialized ? props.children : ''}
            </div>
        </div>
    )
}
