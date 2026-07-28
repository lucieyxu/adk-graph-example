/**
 * Webcam Component
 *
 * A wrapper around WebcamBase that reads camera settings from the settings store.
 * Automatically syncs available cameras to the store for use in settings UI.
 *
 * @example
 * ```tsx
 * import { Webcam, type WebcamHandle } from '@src/components/Webcam'
 *
 * const MyComponent = () => {
 *   const webcamRef = useRef<WebcamHandle>(null)
 *
 *   return (
 *     <div>
 *       <Webcam ref={webcamRef} />
 *       <button onClick={() => console.log(webcamRef.current?.capture())}>
 *         Capture
 *       </button>
 *     </div>
 *   )
 * }
 * ```
 */

import { useSettingsStore } from '@src/stores/settingsStore.ts'
import { forwardRef, useCallback } from 'react'
import { WebcamBase, type WebcamBaseProps, type WebcamHandle } from './WebcamBase.tsx'

export type WebcamProps = WebcamBaseProps

export const Webcam = forwardRef<WebcamHandle, WebcamProps>(
    ({ cameraId, facingMode, mirrored, onDevicesChange, ...props }, ref) => {
        const { selectedCameraId, cameraFacingMode, cameraMirrored, setCameraDevices } =
            useSettingsStore()

        // Sync discovered devices to store
        const handleDevicesChange = useCallback(
            (devices: { deviceId: string; label: string }[]) => {
                setCameraDevices(devices)
                onDevicesChange?.(devices)
            },
            [setCameraDevices, onDevicesChange],
        )

        return (
            <WebcamBase
                ref={ref}
                cameraId={cameraId ?? (selectedCameraId || undefined)}
                facingMode={facingMode ?? cameraFacingMode}
                mirrored={mirrored ?? cameraMirrored}
                onDevicesChange={handleDevicesChange}
                idealFramerate={30}
                idealWidth={1280}
                idealHeight={720}
                enableAudio={false}
                {...props}
            />
        )
    },
)

Webcam.displayName = 'Webcam'
