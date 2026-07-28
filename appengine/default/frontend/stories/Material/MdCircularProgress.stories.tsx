import { MdCircularProgress } from '@shared/ts/lib/material.ts'
import { FixedViewportProvider } from '@src/providers/FixedViewportProvider/index.ts'
import type { Meta, StoryObj } from '@storybook/react'

const meta: Meta = {
    title: 'Frontend/Material/Circular Progress',
    component: MdCircularProgress,
    parameters: { layout: 'fullscreen' },
    decorators: [
        (Story) => (
            <FixedViewportProvider mode='landscape'>
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '100%',
                    }}>
                    <Story />
                </div>
            </FixedViewportProvider>
        ),
    ],
    argTypes: {
        value: {
            control: { type: 'range', min: 0, max: 1, step: 0.1 },
            description: 'Progress value from 0 to 1. Only applies when indeterminate is false.',
        },
        indeterminate: {
            control: 'boolean',
            description: 'Whether progress is indeterminate (animated without specific value)',
        },
        fourColor: {
            control: 'boolean',
            description: 'Whether to use four-color animation for indeterminate progress',
        },
        'aria-label': { table: { disable: true } },
    },
    args: {
        fourColor: false,
    },
} satisfies Meta<typeof MdCircularProgress>

export default meta

type CircularStory = StoryObj<typeof MdCircularProgress>

export const Default: CircularStory = {
    args: {
        value: 0.6,
        indeterminate: false,
    },
    argTypes: {
        fourColor: { table: { disable: true } },
    },
}

export const Indeterminate: CircularStory = {
    args: {
        indeterminate: true,
        fourColor: false,
    },
}
