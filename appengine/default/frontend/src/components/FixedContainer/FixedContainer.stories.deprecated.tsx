import type { Meta, StoryObj } from '@storybook/nextjs'
import { FixedContainer } from './FixedContainer.tsx'

const labelStyles = {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '42px',
    flexDirection: 'column' as const,
    gap: '16px',
} as const

// Sample content components
const PortraitContent = (
    <div style={{ ...labelStyles, backgroundColor: '#f0f0f0' }}>Portrait Only Content</div>
)

const LandscapeContent = (
    <div style={{ ...labelStyles, backgroundColor: '#e8f4fd' }}>Landscape Only Content</div>
)

const ResponsiveContent = (
    <div style={{ ...labelStyles, backgroundColor: '#fff3e0' }}>
        <div>Responsive Content</div>
        <div style={{ fontSize: '16px' }}>Works in both orientations</div>
    </div>
)

// More on how to set up stories at: https://storybook.js.org/docs/writing-stories#default-export
const meta = {
    title: 'Frontend/Components/FixedContainer',
    component: FixedContainer,
    parameters: {
        // Optional parameter to center the component in the Canvas. More info: https://storybook.js.org/docs/configure/story-layout
        layout: 'fullscreen',
    },
    // This component will have an automatically generated Autodocs entry: https://storybook.js.org/docs/writing-docs/autodocs
    tags: ['autodocs'],
    // More on argTypes: https://storybook.js.org/docs/api/argtypes
    argTypes: {
        letterboxColor: { control: 'color' },
    },
    args: {
        letterboxColor: 'var(--gray-900)',
    },
} satisfies Meta<typeof FixedContainer>

export default meta
type Story = StoryObj<typeof meta>

// More on writing stories with args: https://storybook.js.org/docs/writing-stories/args
export const Portrait: Story = {
    args: {
        orientation: 'portrait',
        children: PortraitContent,
    },
}

export const Landscape: Story = {
    args: {
        orientation: 'landscape',
        children: LandscapeContent,
    },
}

export const Responsive: Story = {
    args: {
        orientation: 'responsive',
        children: ResponsiveContent,
    },
}
