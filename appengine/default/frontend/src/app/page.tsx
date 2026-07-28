'use client'

import dynamic from 'next/dynamic'

const ClientPage = dynamic(
    async () => {
        const mod = await import('@src/screens/index.tsx')
        return mod.Screens
        // return mod[Object.keys(mod)[0] as keyof typeof mod]
    },
    {
        ssr: false,
    },
)

export default function Page() {
    return <ClientPage />
}
