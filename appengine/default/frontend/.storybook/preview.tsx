import { colorStyles } from '@shared/ts/colors/colors.ts'
import { themesStyles } from '@shared/ts/colors/themes.ts'
import { gridStyles } from '@src/styles/constants.ts'
import type { Preview } from '@storybook/nextjs'
import '@src/styles/globals.scss'

const styles = [colorStyles, themesStyles, gridStyles].join('')

const preview: Preview = {
    parameters: { controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } } },
    decorators: [
        (Story) => (
            <>
                <style dangerouslySetInnerHTML={{ __html: styles }} />
                <Story />
            </>
        ),
    ],
}

export default preview
