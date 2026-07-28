import { MdSlider } from '@shared/ts/components/MdSlider/index.ts'
import { FixedViewportProvider } from '@src/providers/FixedViewportProvider/FixedViewportProvider.tsx'
import type { Meta, StoryObj } from '@storybook/react'
import { fn } from 'storybook/test'

const meta = {
    title: 'Frontend/Material/Slider',
    component: MdSlider,
    parameters: { layout: 'fullscreen' },
    argTypes: { onChange: { table: { disable: true } } },
    args: {
        onChange: fn(),
        disabled: false,
        value: 0,
        min: 0,
        max: 100,
        step: 1,
        ticks: false,
        name: 'slider',
        range: false,
        labeled: false,
        valueLabel: '',
        valueLabelStart: '',
        valueLabelEnd: '',
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
} satisfies Meta<typeof MdSlider>

export default meta
type Story = StoryObj<typeof MdSlider>

export const Default: Story = {}
