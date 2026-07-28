import { MdLinearProgress } from '@shared/ts/lib/material.ts'
import { FixedViewportProvider } from '@src/providers/FixedViewportProvider/index.ts'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
    title: 'Frontend/Material/Linear Progress',
    component: MdLinearProgress,
    parameters: { layout: 'fullscreen' },
    tags: ['autodocs'],
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
    },
} satisfies Meta<typeof MdLinearProgress>

export default meta

type LinearStory = StoryObj<typeof MdLinearProgress>

export const Default: LinearStory = {
    args: {
        value: 0.7,
        indeterminate: false,
        'aria-label': 'Loading progress',
    },
}

export const Indeterminate: LinearStory = {
    args: {
        indeterminate: true,
    },
}
