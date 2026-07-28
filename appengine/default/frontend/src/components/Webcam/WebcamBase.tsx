/**
 * WebcamBase Component
 *
 * A video component that captures webcam feed with automatic orientation detection.
 * Provides methods to capture still images and access the video stream.
 *
 * This is the base/pure component that accepts all configuration via props.
 * For a version that reads configuration from the settings store, use `Webcam`.
 *
 * @example
 * ```tsx
 * import { WebcamBase } from '@src/components/Webcam'
 *
 * const MyComponent = () => {
 *   const webcamRef = useRef<WebcamHandle>(null)
 *
 *   const handleCapture = () => {
 *     const imageData = webcamRef.current?.capture()
 *     if (imageData) {
 *       console.log('Captured image:', imageData)
 *     }
 *   }
 *
 *   return (
 *     <div>
 *       <WebcamBase ref={webcamRef} facingMode="user" />
 *       <button onClick={handleCapture}>Capture</button>
 *     </div>
 *   )
 * }
 * ```
 */

import { MdIcon } from '@shared/ts/components/MdIcon/index.ts'
import cn from 'classnames'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import styles from './Webcam.module.scss'

export type WebcamStatus = 'initializing' | 'ready' | 'permission-denied' | 'error'

export interface WebcamHandle {
    /** Capture a still image from the video stream. Returns base64 data URL or null if not ready. */
    capture: (type?: 'image/png' | 'image/jpeg', quality?: number) => string | null
    /** Get the underlying video element */
    getVideo: () => HTMLVideoElement | null
    /** Get the current MediaStream */
    getStream: () => MediaStream | null
}

export interface WebcamBaseProps {
    /** Specific camera device ID. If not provided, uses facingMode or system default. */
    cameraId?: string
    /** Preferred camera facing mode. 'user' for front camera, 'environment' for rear. */
    facingMode?: 'user' | 'environment'
    /** Preferred camera stream width resolution */
    idealWidth?: number
    /** Preferred camera stream height resolution */
    idealHeight?: number
    /** Preferred camera stream framerate */
    idealFramerate?: number
    /** Mirror the video horizontally. Defaults to true for 'user' facing mode. */
    mirrored?: boolean
    /** Use audio from the webcam device */
    enableAudio?: boolean
    /** Callback fired when camera becomes ready */
    onReady?: () => void
    /** Callback fired on error */
    onError?: (error: Error) => void
    /** Callback fired when available cameras are enumerated */
    onDevicesChange?: (devices: { deviceId: string; label: string }[]) => void
    /** Optional CSS class name */
    className?: string
}

export const WebcamBase = forwardRef<WebcamHandle, WebcamBaseProps>(
    (
        {
            cameraId,
            facingMode = 'user',
            mirrored,
            idealWidth,
            idealHeight,
            idealFramerate,
            enableAudio,
            onReady,
            onError,
            onDevicesChange,
            className,
        },
        ref,
    ) => {
        const videoRef = useRef<HTMLVideoElement>(null)
        const streamRef = useRef<MediaStream | null>(null)
        const canvasRef = useRef<HTMLCanvasElement | null>(null)

        // Use refs for callbacks to prevent re-init when they change
        const onErrorRef = useRef(onError)
        const onDevicesChangeRef = useRef(onDevicesChange)

        useEffect(() => {
            onErrorRef.current = onError
        }, [onError])

        useEffect(() => {
            onDevicesChangeRef.current = onDevicesChange
        }, [onDevicesChange])

        const [status, setStatus] = useState<WebcamStatus>('initializing')

        // Default mirrored to true for user-facing camera
        const shouldMirror = mirrored ?? facingMode === 'user'

        // Handle video metadata loaded
        const handleLoadedMetadata = useCallback(() => {
            setStatus('ready')
            onReady?.()
        }, [onReady])

        // Capture still image
        const capture = useCallback(
            (type: 'image/png' | 'image/jpeg' = 'image/jpeg', quality = 0.92): string | null => {
                const video = videoRef.current
                if (!video || status !== 'ready') return null

                // Create or reuse canvas
                if (!canvasRef.current) {
                    canvasRef.current = document.createElement('canvas')
                }
                const canvas = canvasRef.current
                const ctx = canvas.getContext('2d')
                if (!ctx) return null

                // Set canvas size to video dimensions
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight

                // Handle mirroring
                if (shouldMirror) {
                    ctx.translate(canvas.width, 0)
                    ctx.scale(-1, 1)
                }

                // Draw video frame
                ctx.drawImage(video, 0, 0)

                // Reset transform
                if (shouldMirror) {
                    ctx.setTransform(1, 0, 0, 1, 0, 0)
                }

                return canvas.toDataURL(type, quality)
            },
            [status, shouldMirror],
        )

        // Expose methods via ref, so we can use the webcam elsewhere
        useImperativeHandle(
            ref,
            () => ({
                capture,
                getVideo: () => videoRef.current,
                getStream: () => streamRef.current,
            }),
            [capture],
        )

        // Initialize camera
        useEffect(() => {
            let isMounted = true

            const initCamera = async () => {
                // Stop existing stream
                if (streamRef.current) {
                    for (const track of streamRef.current.getTracks()) {
                        track.stop()
                    }
                    streamRef.current = null
                }

                setStatus('initializing')

                try {
                    // Build constraints with ideal resolution for quality
                    const constraints: MediaStreamConstraints = {
                        video: {
                            deviceId:
                                cameraId && cameraId !== 'default'
                                    ? { exact: cameraId }
                                    : undefined,
                            facingMode: cameraId && cameraId !== 'default' ? undefined : facingMode,
                        },
                        audio: enableAudio,
                    }

                    if (idealWidth && constraints.video && constraints.video !== true) {
                        constraints.video.width = { ideal: idealWidth }
                    }

                    if (idealHeight && constraints.video && constraints.video !== true) {
                        constraints.video.height = { ideal: idealHeight }
                    }

                    if (idealFramerate && constraints.video && constraints.video !== true) {
                        constraints.video.frameRate = { ideal: idealFramerate }
                    }

                    const stream = await navigator.mediaDevices.getUserMedia(constraints)

                    if (!isMounted) {
                        for (const track of stream.getTracks()) {
                            track.stop()
                        }
                        return
                    }

                    streamRef.current = stream

                    if (videoRef.current) {
                        videoRef.current.srcObject = stream
                    }

                    // Enumerate devices after getting permission
                    const devices = await navigator.mediaDevices.enumerateDevices()
                    const videoDevices = devices
                        .filter((d) => d.kind === 'videoinput')
                        .map((d) => ({
                            deviceId: d.deviceId,
                            label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
                        }))

                    if (isMounted) {
                        onDevicesChangeRef.current?.(videoDevices)
                    }
                } catch (e) {
                    if (!isMounted) return

                    const error = e instanceof Error ? e : new Error('Failed to access camera')
                    console.error('Camera error:', error)

                    // Detect permission denied (NotAllowedError or PermissionDeniedError)
                    if (
                        error.name === 'NotAllowedError' ||
                        error.name === 'PermissionDeniedError'
                    ) {
                        setStatus('permission-denied')
                    } else {
                        setStatus('error')
                    }

                    onErrorRef.current?.(error)
                }
            }

            initCamera()

            // Listen for device changes
            const handleDeviceChange = async () => {
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices()
                    const videoDevices = devices
                        .filter((d) => d.kind === 'videoinput')
                        .map((d) => ({
                            deviceId: d.deviceId,
                            label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
                        }))
                    onDevicesChangeRef.current?.(videoDevices)
                } catch (e) {
                    console.error('Error enumerating devices:', e)
                }
            }

            navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange)

            return () => {
                isMounted = false
                navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange)
                if (streamRef.current) {
                    for (const track of streamRef.current.getTracks()) {
                        track.stop()
                    }
                }
            }
        }, [cameraId, facingMode, idealWidth, idealHeight, idealFramerate, enableAudio])

        return (
            <div className={cn(styles.container, shouldMirror && styles.mirrored, className)}>
                {status === 'permission-denied' ? (
                    <div className={styles.statusOverlay}>
                        <MdIcon icon='videocam_off' filled className={styles.statusIcon} />
                        <span className={styles.statusText}>Camera access denied</span>
                        <span className={styles.statusHint}>
                            Check browser settings to enable camera
                        </span>
                    </div>
                ) : status === 'error' ? (
                    <div className={styles.statusOverlay}>
                        <MdIcon icon='error' filled className={styles.statusIcon} />
                        <span className={styles.statusText}>Camera unavailable</span>
                    </div>
                ) : (
                    <>
                        {status === 'initializing' && (
                            <div className={styles.loadingOverlay}>
                                <div className={styles.spinner} />
                            </div>
                        )}
                        <video
                            ref={videoRef}
                            className={styles.video}
                            autoPlay
                            playsInline
                            muted
                            onLoadedMetadata={handleLoadedMetadata}
                        />
                    </>
                )}
            </div>
        )
    },
)

WebcamBase.displayName = 'WebcamBase'
