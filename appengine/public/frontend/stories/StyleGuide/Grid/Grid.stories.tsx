import { FixedViewportProvider } from '@src/providers/FixedViewportProvider/index.ts'
import { grid } from '@src/styles/constants.ts'
import type { Meta, StoryObj } from '@storybook/nextjs'
import styles from './Grid.module.scss'

const GridDemo = () => {
    const items = Array.from({ length: grid.columns }, (_, i) => (
        <div key={`grid-item-${i}`} className={styles.item}>
            {i + 1}
        </div>
    ))

    return (
        <div className={styles.container}>
            <p className={styles.description}>
                Uses <code>@include m.grid</code> and <code>@include m.container</code> with default
                CSS custom properties <code>--grid-columns</code> and <code>--grid-gutter</code>.
                These values are available in JS via the <code>grid</code> object:{' '}
                <code>grid.columns</code>, <code>grid.gutter</code>, <code>grid.margin</code>.
            </p>
            <div className={styles.grid}>{items}</div>
        </div>
    )
}

const meta: Meta = {
    component: GridDemo,
    title: 'Frontend/Style Guide/Grid',
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <FixedViewportProvider mode='landscape'>
                <Story />
            </FixedViewportProvider>
        ),
    ],
}

export default meta

export const Grid: StoryObj = {}
