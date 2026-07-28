import { MdSwitch } from '@shared/ts/lib/material.ts'
import { FixedViewportProvider } from '@src/providers/FixedViewportProvider/FixedViewportProvider.tsx'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'

const meta = {
    title: 'Frontend/Material/Switch',
    component: MdSwitch,
    parameters: { layout: 'fullscreen' },
    argTypes: {
        onChange: {
            table: {
                disable: true,
            },
        },
    },
    args: {
        onChange: fn(),
        selected: false,
        disabled: false,
        icons: true,
        showOnlySelectedIcon: true,
        required: true,
        value: 'on',
        name: 'switch',
    },
    decorators: [
        (Story) => (
            <>
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
            </>
        ),
    ],
} satisfies Meta<typeof MdSwitch>

export default meta
type Story = StoryObj<typeof MdSwitch>

export const Default: Story = {}
