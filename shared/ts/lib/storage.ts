import { useUrls } from '@shared/ts/hooks/useUrls.ts'

// biome-ignore lint/correctness/useHookAtTopLevel: safe for use outside of react
const urls = useUrls()

export const bucket = `${process.env.NEXT_PUBLIC_GCP_PROJECT_ID}-storage-${process.env.NEXT_PUBLIC_ENV}`

export const gcsUriToReadUrl = (gcsUri: string, url?: string) => {
    const _url = url ? url : urls.appengineDefaultBackend
    return gcsUri.replaceAll('gs://', `${_url}/api/storage/read/`)
}

export const gcsUriToWriteUrl = (gcsUri: string, url?: string) => {
    const _url = url ? url : urls.appengineDefaultBackend
    return gcsUri.replaceAll('gs://', `${_url}/api/storage/write/`)
}
