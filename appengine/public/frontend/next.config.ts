import path from 'node:path'
import type { NextConfig } from 'next'

// SILENCE Lit dev mode warning
;(globalThis as { litIssuedWarnings?: Set<string> }).litIssuedWarnings = new Set([
    'Lit is in dev mode. Not recommended for production! See https://lit.dev/msg/dev-mode for more information.',
])

const cspHeader = `
    default-src 'self';
    script-src 'self';
    style-src 'self';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    upgrade-insecure-requests;
`

const nextConfig: NextConfig = {
    turbopack: {
        root: path.join(__dirname, '..', '..', '..'),
        rules: {
            '*.svg': {
                as: '*.js',
                loaders: [
                    {
                        loader: '@svgr/webpack',
                        options: { svgo: false },
                    },
                ],
            },
        },
    },
    webpack(config) {
        // biome-ignore lint/suspicious/noExplicitAny: unknown type
        const fileLoaderRule = config.module.rules.find((rule: any) => rule.test?.test?.('.svg'))

        config.module.rules.push(
            // Reapply the existing rule, but only for svg imports ending in ?url
            {
                ...fileLoaderRule,
                test: /\.svg$/i,
                resourceQuery: /url/, // *.svg?url
            },
            // Convert all other *.svg imports to React components
            {
                test: /\.svg$/i,
                issuer: fileLoaderRule.issuer,
                resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] }, // exclude if *.svg?url
                use: [{ loader: '@svgr/webpack', options: { svgo: false } }],
            },
        )

        // Modify the file loader rule to ignore *.svg, since we have it handled now.
        fileLoaderRule.exclude = /\.svg$/i

        return config
    },
    devIndicators: false,
    output: 'export',
    distDir: 'dist',
    logging: false,
}

if (process.env.ENV !== 'dev') {
    // ENABLE Subresource Integrity during build

    nextConfig.headers = async () => {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Content-Security-Policy',
                        value: cspHeader.replace(/\n/g, ''),
                    },
                ],
            },
        ]
    }

    nextConfig.experimental = {
        sri: {
            algorithm: 'sha256', // or 'sha384' or 'sha512'
        },
    }
}

export default nextConfig
