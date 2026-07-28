'use client'

import { SettingsMenu } from '@src/components/SettingsMenu/index.ts'
import { AudioProvider } from '@src/providers/AudioProvider/index.ts'
import { FixedViewportProvider } from '@src/providers/FixedViewportProvider/index.ts'
import { GenApisProvider } from '@src/providers/GenApisProvider/index.tsx'
import { Head } from '@src/providers/Head/index.tsx'
import { HighPerformanceProvider } from '@src/providers/HighPerformanceProvider/index.tsx'
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
                    <FixedViewportProvider>
                        <ManifestInjectionProvider>
                            <AudioProvider>
                                <GenApisProvider>
                                    <HighPerformanceProvider>
                                        {children}
                                        <SettingsMenu location={'top-left'} />
                                    </HighPerformanceProvider>
                                </GenApisProvider>
                            </AudioProvider>
                        </ManifestInjectionProvider>
                    </FixedViewportProvider>
                </Provider>
            </body>
            <SettingsInitializerProvider />
        </html>
    )
}
