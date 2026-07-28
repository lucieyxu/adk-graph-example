/** biome-ignore-all lint/style/useNamingConvention: no please */
declare type ENV = 'dev' | 'staging' | 'prod'

declare namespace NodeJs {
    interface ProcessEnv {
        ENV: ENV
        NEXT_PUBLIC_ENV: ENV
    }
}

declare module '*.scss' {
    const content: Record<string, string>
    export default content
}

declare module '*.svg' {
    import type React from 'react'
    const SVG: React.VFC<React.SVGProps<SVGSVGElement>>
    export default SVG
}

// biome-ignore lint/suspicious/noExplicitAny: generic any
declare type PartialRecord<K extends keyof any, T> = Partial<Record<K, T>>
