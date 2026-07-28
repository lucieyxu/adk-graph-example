import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/nextjs'

const require = createRequire(import.meta.url)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
const getAbsolutePath = (value: string): string =>
    dirname(require.resolve(join(value, 'package.json')))

const config: StorybookConfig = {
    stories: [
        '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
        '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
        '../../../../shared/stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    ],
    framework: {
        name: getAbsolutePath('@storybook/nextjs'),
        options: {},
    },
    staticDirs: ['../public'],
    typescript: {
        check: false,
        checkOptions: {},
    },
    webpackFinal: async (config) => {
        if (config.resolve) {
            config.resolve.alias = {
                ...config.resolve.alias,
                '@shared': join(__dirname, '../../../../shared'),
                '@src': join(__dirname, '../src'),
                '@public': join(__dirname, '../public'),
            }
        }
        return config
    },
}

export default config
