import { MdSelect } from '@shared/ts/components/MdSelect/MdSelect.tsx'
import { FixedViewportProvider } from '@src/providers/FixedViewportProvider/FixedViewportProvider.tsx'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'

const meta = {
    title: 'Frontend/Material/Select',
    component: MdSelect,
    parameters: { layout: 'fullscreen' },
    argTypes: {
        options: {
            control: 'object',
            description: 'Array of option strings for the select dropdown',
        },
        onChange: {
            table: {
                disable: true,
            },
        },
    },
    args: {
        onChange: fn(),
        disabled: false,
        variant: 'outlined',
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
} satisfies Meta<typeof MdSelect>

export default meta
type Story = StoryObj<typeof MdSelect>

export const Default: Story = {
    args: {
        label: 'Country',
        options: ['USA', 'Canada', 'Mexico'],
    },
}

export const WithManyOptions: Story = {
    args: {
        options: [
            'First Option',
            'Second Option',
            'Third Option',
            'Fourth Option',
            'Fifth Option',
            'Sixth Option',
            'Seventh Option',
            'Eighth Option',
        ],
    },
}

export const WithLongOptionNames: Story = {
    args: {
        options: [
            'This is a very long option name that might wrap',
            'Another extremely long option name for testing',
            'Short option',
            'Medium length option name',
        ],
    },
}

export const SingleOption: Story = {
    args: {
        options: ['Only Option'],
    },
}

export const Empty: Story = {
    args: {
        options: [],
    },
}
