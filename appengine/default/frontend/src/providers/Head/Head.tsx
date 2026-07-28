import manifest from '@public/manifest.json'
import { colorStyles } from '@shared/ts/colors/colors.ts'
import { themesStyles } from '@shared/ts/colors/themes.ts'
import { gridStyles } from '@src/styles/constants.ts'

const styles = [colorStyles, themesStyles, gridStyles].join('')

const DEBUG_GTAG = false

export const Head = () => (
    <head>
        <style dangerouslySetInnerHTML={{ __html: styles }} />
        <script>window.TONE_SILENCE_LOGGING = true;</script>
        {
            // ADD Google Analytics tag in production builds
            (DEBUG_GTAG || process.env.NEXT_PUBLIC_ENV === 'prod') && (
                <>
                    <script
                        async
                        src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_TAG_ID}`}></script>
                    <script
                        dangerouslySetInnerHTML={{
                            __html: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${process.env.NEXT_PUBLIC_GA_TAG_ID}');`,
                        }}
                    />
                </>
            )
        }

        <link
            rel='preload'
            href='/fonts/google-noto-emoji/GoogleNotoEmoji.woff2'
            as='font'
            type='font/woff2'
            crossOrigin='anonymous'
        />

        <link
            rel='preload'
            href='/fonts/google-sans-display/GoogleSansDisplay-Regular.woff2'
            as='font'
            type='font/woff2'
            crossOrigin='anonymous'
        />

        <link
            rel='preload'
            href='/fonts/google-sans-text/GoogleSansText-Medium.woff2'
            as='font'
            type='font/woff2'
            crossOrigin='anonymous'
        />

        <link
            rel='preload'
            href='/fonts/material-symbols/MaterialSymbolsRounded.woff2'
            as='font'
            type='font/woff2'
            crossOrigin='anonymous'
        />

        {/* 
            Preload any more fonts here
        */}

        {/* Recommended Meta Tags */}
        <meta charSet='utf-8' />
        <meta name='language' content='english' />
        <meta httpEquiv='content-type' content='text/html' />
        <meta name='author' content={manifest.author} />
        <meta name='designer' content={manifest.author} />
        <meta name='publisher' content={manifest.author} />

        {/* Search Engine Optimization Meta Tags */}
        <title>{manifest.name}</title>
        <meta name='description' content={manifest.description} />
        <meta name='keywords' content='Innovation,Prototype,AI' />
        <meta name='robots' content='index,follow' />
        <meta name='distribution' content='web' />
        {
            // Facebook Open Graph meta tags
            // documentation: https://developers.facebook.com/docs/sharing/opengraph
        }
        <meta property='og:title' content={manifest.name} />
        <meta property='og:type' content='site' />
        <meta property='og:url' content={manifest.url} />
        <meta property='og:image' content={'/iamges/share.png'} />
        <meta property='og:site_name' content={manifest.name} />
        <meta property='og:description' content={manifest.description} />

        <link rel='icon' type='image/png' href='/favicons/favicon-96x96.png' sizes='96x96' />
        <link rel='icon' type='image/svg+xml' href='/favicons/favicon.svg' />
        <link rel='shortcut icon' href='/favicons/favicon.ico' />
        <link rel='apple-touch-icon' sizes='180x180' href='/favicons/apple-touch-icon.png' />

        {/*
            // LOADED dynamically in /app/layout.tsx
            <link rel='manifest' href='/manifest.json' />
        */}

        <meta
            name='viewport'
            content='initial-scale=1, width=device-width, interactive-widget=overlays-content'
        />

        <meta name='theme-color' content='#000' />
        <link rel='shortcut icon' href='/favicons/apple-touch-icon.png' />

        {
            // Twitter Summary card
            // documentation: https://dev.twitter.com/cards/getting-started
            // Be sure validate your Twitter card markup on the documentation site.
        }
        <meta name='twitter:card' content='summary' />
        <meta name='twitter:site' content={manifest.twitter} />

        <style>{'body { background-color: black; }'}</style>
    </head>
)
