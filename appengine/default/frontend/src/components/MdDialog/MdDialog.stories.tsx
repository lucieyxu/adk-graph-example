import { MdFilledButton } from '@shared/ts/lib/material.ts'
import { type DialogProps, MdDialog } from '@src/components/MdDialog/index.ts'
import { FixedViewportProvider } from '@src/providers/FixedViewportProvider/index.ts'
import type { Meta, StoryObj } from '@storybook/react'
import { useState } from 'react'
import { action } from 'storybook/actions'

const meta: Meta = {
    title: 'Frontend/Components/Dialog',
    component: MdDialog,
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
        children: { table: { disable: true } },
        ref: { table: { disable: true } },
        onClose: { table: { disable: true } },
        onOpen: { table: { disable: true } },
        customOpenAnimation: { table: { disable: true } },
        customCloseAnimation: { table: { disable: true } },
    },
    args: {
        open: false,
        onClose: action('onClose'),
        onOpen: action('onOpen'),
    },
} satisfies Meta<typeof MdDialog>

export default meta

type DialogStory = StoryObj<typeof MdDialog>

// Reusable story template
const createDialogStory = (content: {
    buttonText: string
    headline: string
    title: string
    description: string
    fullScreen?: boolean
    quick?: boolean
}) => {
    return {
        render: ({ ...args }: DialogProps) => {
            const [open, setOpen] = useState(false)

            return (
                <>
                    <MdFilledButton onClick={() => setOpen((old) => !old)}>
                        {content.buttonText}
                    </MdFilledButton>
                    <MdDialog
                        {...args}
                        open={open}
                        onClose={(e) => {
                            setOpen(false)
                            args.onClose?.(e)
                        }}
                        fullScreen={content.fullScreen}
                        quick={content.quick}>
                        <div slot='headline'>{content.headline}</div>
                        <div slot='content'>
                            <h1>{content.title}</h1>
                            <p>{content.description}</p>
                        </div>
                        <div slot='actions'>
                            <MdFilledButton onClick={() => setOpen(false)}>Close</MdFilledButton>
                        </div>
                    </MdDialog>
                </>
            )
        },
    }
}

export const Default: DialogStory = createDialogStory({
    buttonText: 'Open',
    headline: 'Test Modal',
    title: 'Test Modal',
    description:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.',
})

export const FullScreen: DialogStory = createDialogStory({
    buttonText: 'Open Full Screen',
    headline: 'Full Screen Modal',
    title: 'Full Screen Modal',
    description: 'This modal uses the fullScreen prop to test our fix.',
    fullScreen: true,
})

export const LowPerformance: DialogStory = createDialogStory({
    buttonText: 'Open',
    headline: 'Test Modal',
    title: 'Test Modal',
    description:
        'Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos. Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam, quos.',
    quick: true,
})
