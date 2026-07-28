import { MdIcon } from '@shared/ts/components/MdIcon/index.ts'
import { FixedViewportProvider } from '@src/providers/FixedViewportProvider/index.ts'
import type { Meta, StoryObj } from '@storybook/react'

const meta = {
    title: 'Frontend/Material/Icon',
    component: MdIcon,
    parameters: { layout: 'fullscreen' },
    args: { icon: 'arrow_forward' },
    argTypes: {
        icon: { control: 'text', description: 'Material icon name' },
        filled: {
            control: 'boolean',
            description: 'Icon style variant',
        },
        size: {
            control: 'text',
            description: 'Custom icon size (CSS value)',
        },
        className: { control: false },
    },
    decorators: [
        (Story) => (
            <FixedViewportProvider mode='landscape'>
                <div style={{ fontSize: '160rem' }}>
                    <Story />
                </div>
            </FixedViewportProvider>
        ),
    ],
} satisfies Meta<typeof MdIcon>

export default meta
type Story = StoryObj<typeof MdIcon>

export const Default: Story = {
    args: {
        icon: 'arrow_forward',
    },
}

export const Outlined: Story = {
    args: {
        ...Default.args,
        filled: false,
    },
}

export const CustomSize: Story = {
    args: {
        ...Default.args,
        size: '200rem',
    },
}
