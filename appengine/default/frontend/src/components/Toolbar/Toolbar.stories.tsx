import { MdIcon } from '@shared/ts/components/MdIcon/MdIcon.tsx'
import { MdSelect } from '@shared/ts/components/MdSelect/index.ts'
import { MdSlider } from '@shared/ts/components/MdSlider/index.ts'
import { MdIconButton, MdSwitch } from '@shared/ts/lib/material.ts'
import { Button } from '@src/components/Button/index.ts'
import { FixedViewportProvider } from '@src/providers/FixedViewportProvider/index.ts'
import type { Meta, StoryFn } from '@storybook/react'
import { useCallback, useState } from 'react'
import { ToolbarPortal } from './ToolbarPortal.tsx'
import { ToolbarProvider } from './ToolbarProvider.tsx'
import { TOOLBAR_POSITIONS } from './toolbarAtom.ts'

const meta: Meta<typeof ToolbarProvider> = {
    title: 'Frontend/Components/Toolbar',
    component: ToolbarProvider,
    args: { position: TOOLBAR_POSITIONS.bottom },
    argTypes: {
        position: { control: 'select', options: Object.values(TOOLBAR_POSITIONS) },
    },
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
                        gap: '1rem',
                    }}>
                    <Story />
                </div>
            </FixedViewportProvider>
        ),
    ],
}
export default meta

const componentTypes = ['button', 'text', 'icon-button', 'select']
export const Simple: StoryFn<typeof ToolbarProvider> = (args) => {
    const { position } = args
    const [toolbarElements, setToolbarElements] = useState<
        { element: React.ReactNode; order?: number }[]
    >([])
    const [order, setOrder] = useState(0)
    const [orderEnabled, setOrderEnabled] = useState(false)
    const removeFirstElement = useCallback(() => {
        setToolbarElements((prev) => prev.slice(1))
    }, [])

    const handleAddToolbarElement = useCallback(() => {
        const componentType = componentTypes[Math.floor(Math.random() * componentTypes.length)]
        switch (componentType) {
            case 'button':
                setToolbarElements((prev) => [
                    ...prev,
                    {
                        element: (
                            <Button key={`toolbar-element-${prev.length}`}>Toolbar Element</Button>
                        ),
                        order: orderEnabled ? order : undefined,
                    },
                ])
                break
            case 'text':
                setToolbarElements((prev) => [
                    ...prev,
                    {
                        element: (
                            <div
                                key={`toolbar-element-${prev.length}`}
                                style={{ whiteSpace: 'nowrap' }}>
                                Toolbar Element
                            </div>
                        ),
                        order: orderEnabled ? order : undefined,
                    },
                ])
                break
            case 'icon-button':
                setToolbarElements((prev) => [
                    ...prev,
                    {
                        element: (
                            <MdIconButton key={`toolbar-element-${prev.length}`}>
                                <MdIcon icon='star' />
                            </MdIconButton>
                        ),
                        order: orderEnabled ? order : undefined,
                    },
                ])
                break
            case 'select':
                setToolbarElements((prev) => [
                    ...prev,
                    {
                        element: (
                            <MdSelect
                                key={`toolbar-element-${prev.length}`}
                                label='Toolbar Element'
                                options={['one', 'two', 'three']}
                            />
                        ),
                        order: orderEnabled ? order : undefined,
                    },
                ])
                break
        }
    }, [order, orderEnabled])

    console.log('orderEnabled', orderEnabled)

    return (
        <>
            <label htmlFor='order'>
                Order:
                <MdSwitch
                    selected={orderEnabled}
                    onChange={() => setOrderEnabled((old) => !old)}
                    id='order'
                />
                <MdSlider
                    labeled
                    disabled={!orderEnabled}
                    min={0}
                    max={10}
                    value={order}
                    onChange={setOrder}
                    id='order'
                />
            </label>
            <Button onClick={handleAddToolbarElement}>Add Toolbar Element</Button>
            <Button onClick={removeFirstElement}>Remove First Element</Button>
            {toolbarElements.map((element, index) => (
                <ToolbarPortal order={element.order} key={index}>
                    {element.element}
                </ToolbarPortal>
            ))}
            <ToolbarProvider position={position} />
        </>
    )
}
