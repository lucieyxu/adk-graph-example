import allUrls from '@shared/config/urls.json'

type UrlSet = {
    appengineDefaultFrontend: string
    appengineDefaultBackend: string
    appengineDefaultStorybook?: string
    appenginePublicFrontend: string
    appenginePublicBackend: string
    appenginePublicStorybook?: string
    servicesPyExample: string
    servicesTsExample: string
}

/**
 * useUrls is a simple hook that returns relevant URLs to various APIs and services, based on the
 * environment (dev, staging, or prod). This hook must be used to interface with any backend API.
 *
 * No params -- the environment variable is set for you.
 */

export const useUrls = () => {
    // This hook must remain safe for use outside of react
    const env = process.env.NEXT_PUBLIC_ENV as ENV
    const urls = allUrls[env] ?? allUrls['dev']
    return urls as UrlSet
}
