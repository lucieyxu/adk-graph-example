import { FixedViewportProvider } from '@src/providers/FixedViewportProvider/FixedViewportProvider.tsx'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'
import { MdSwitch } from './MdSwitch.tsx'

const meta: Meta<typeof MdSwitch> = {
    title: 'Frontend/Components/MdSwitch',
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
                <FixedViewportProvider mode='landscape' letterboxColor='var(--black)'>
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
}

export default meta
type Story = StoryObj<typeof MdSwitch>

export const Default: Story = {}
