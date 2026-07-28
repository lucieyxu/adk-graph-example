'use client'

import { type PropsWithChildren, useEffect, useRef, useState } from 'react'

export const ManifestInjectionProvider = ({ children }: PropsWithChildren) => {
    const loadedRef = useRef<boolean>(false)
    const [loaded, setLoaded] = useState<boolean>(false)

    useEffect(() => {
        const task = async () => {
            loadedRef.current = true

            // INJECT manifest this way, because IAP blocks it otherwise and the
            // app wont be recognized as a PWA
            const data = await fetch('/manifest.json')
            const manifest = await data.json()
            manifest.start_url = window.location.origin + window.location.pathname
            manifest.scope = `${window.location.origin}/`
            manifest.icons.forEach((i: { src: string }) => {
                i.src = window.location.origin + i.src
            })
            const content = encodeURIComponent(JSON.stringify(manifest))
            const url = `data:application/manifest+json,${content}`
            const element = document.createElement('link')
            element.setAttribute('rel', 'manifest')
            element.setAttribute('href', url)
            document.querySelector('head')?.appendChild(element)

            setLoaded(true)
        }

        if (!loadedRef.current) task()
    })

    return loaded && children
}
