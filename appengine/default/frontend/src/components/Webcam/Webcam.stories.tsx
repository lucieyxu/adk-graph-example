import type { Meta, StoryObj } from '@storybook/react'
import { useRef, useState } from 'react'
import { Webcam, type WebcamHandle } from './index.ts'

const meta: Meta<typeof Webcam> = {
    title: 'Components/Webcam',
    component: Webcam,
    tags: ['autodocs'],
    parameters: {
        layout: 'centered',
    },
}

export default meta
type Story = StoryObj<typeof Webcam>

export const Default: Story = {
    render: () => {
        const webcamRef = useRef<WebcamHandle>(null)
        const [capturedImage, setCapturedImage] = useState<string | null>(null)
        const [devices, setDevices] = useState<{ deviceId: string; label: string }[]>([])

        const handleCapture = () => {
            const image = webcamRef.current?.capture()
            if (image) {
                setCapturedImage(image)
            }
        }

        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '400px' }}>
                <Webcam
                    ref={webcamRef}
                    onDevicesChange={setDevices}
                    onReady={() => console.log('Camera ready')}
                    onError={(e) => console.error('Camera error:', e)}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button type='button' onClick={handleCapture}>
                        Capture Image
                    </button>
                </div>
                {devices.length > 0 && (
                    <div>
                        <strong>Available cameras:</strong>
                        <ul>
                            {devices.map((d) => (
                                <li key={d.deviceId}>{d.label}</li>
                            ))}
                        </ul>
                    </div>
                )}
                {capturedImage && (
                    <div>
                        <strong>Captured:</strong>
                        <img
                            src={capturedImage}
                            alt='Captured'
                            style={{ width: '100%', borderRadius: '8px', marginTop: '8px' }}
                        />
                    </div>
                )}
            </div>
        )
    },
}

export const EnvironmentCamera: Story = {
    args: {
        facingMode: 'environment',
    },
    render: (args) => (
        <div style={{ width: '400px' }}>
            <Webcam {...args} />
            <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                Using rear/environment camera (if available)
            </p>
        </div>
    ),
}

export const NotMirrored: Story = {
    args: {
        facingMode: 'user',
        mirrored: false,
    },
    render: (args) => (
        <div style={{ width: '400px' }}>
            <Webcam {...args} />
            <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
                Front camera without mirroring
            </p>
        </div>
    ),
}
