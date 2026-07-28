'use client'

import { FixedViewportProvider } from '@src/providers/FixedViewportProvider/index.ts'
import { Head } from '@src/providers/Head/index.tsx'
import { ManifestInjectionProvider } from '@src/providers/ManifestInjectionProvider/index.ts'
import { SettingsInitializerProvider } from '@src/providers/SettingsInitializerProvider/index.ts'
import { ThemeProvider } from '@src/providers/ThemeProvider/ThemeProvider.tsx'
import { Provider } from 'jotai'
import type { PropsWithChildren } from 'react'
import '@src/styles/globals.scss'

export default function RootLayout({ children }: PropsWithChildren) {
    return (
        <html lang='en' className='antialiased'>
            <Head />
            <body>
                <Provider>
                    <ThemeProvider />
                    <FixedViewportProvider
                        disabled={true}
                        viewportBackground='var(--md-sys-color-background)'>
                        <ManifestInjectionProvider>{children}</ManifestInjectionProvider>
                    </FixedViewportProvider>
                </Provider>
            </body>
            <SettingsInitializerProvider />
        </html>
    )
}
