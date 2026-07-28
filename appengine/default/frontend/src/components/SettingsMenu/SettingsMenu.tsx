import GoogleCloudLockup from '@public/images/google-cloud-lockup.svg'
import { EventCreateApi } from '@shared/ts/apis/general.ts'
import { MdIcon } from '@shared/ts/components/MdIcon/index.ts'
import { MdSelect } from '@shared/ts/components/MdSelect/index.ts'
import { MdFilledIconButton, MdFilledTextField, MdSwitch } from '@shared/ts/lib/material.ts'
import { bezierEasing } from '@shared/ts/lib/motion.ts'
import { isMobile } from '@shared/ts/lib/utils.ts'
import { MdSlider } from '@src/components/MdSlider/index.ts'
import { ToastProvider } from '@src/components/Toast/index.tsx'
import { Toast } from '@src/components/Toast/Toast.tsx'
import { useEventsFirestore } from '@src/hooks/useEventsFirestore.ts'
import { LANGUAGES } from '@src/i18n/locales.ts'
import { screenKeys } from '@src/screens/index.tsx'
import { useSessionManagerStore } from '@src/stores/sessionManagerStore.ts'
import { DEFAULT_SETTINGS, useSettingsStore } from '@src/stores/settingsStore.ts'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../Button/index.ts'
import { Installer } from './Installer.tsx'
import { PromptEditor } from './PromptEditor.tsx'
import styles from './SettingsMenu.module.scss'
import { SettingsMenuSection } from './SettingsMenuSection.tsx'

const menuMotionProps = {
    initial: 'closed',
    animate: 'open',
    exit: 'closed',
    variants: { open: { opacity: 1 }, closed: { opacity: 0 } },
    transition: { duration: 0.25, ease: bezierEasing },
}

//
// Reveal the Demo Settings Menu by triple clicking in the top right corner of the virtual viewport,
// or press CTRL + SHIFT + C / CTRL + ALT + C
//

const useMultiClick = (callback: () => void) => {
    const { requestEndWithConfirmation } = useSessionManagerStore()
    const clickCountRef = useRef(0)
    const timeoutRef = useRef(-1)

    const handleMultiClick = useCallback(() => {
        clickCountRef.current += 1

        if (timeoutRef.current) clearTimeout(timeoutRef.current)

        if (clickCountRef.current === 3) {
            callback()
            clickCountRef.current = 0
            return
        }

        // Reset after 500ms for fast triple-click detection
        timeoutRef.current = window.setTimeout(() => {
            if (clickCountRef.current === 2) {
                requestEndWithConfirmation()
            }

            clickCountRef.current = 0
        }, 500)
    }, [callback, requestEndWithConfirmation])

    return handleMultiClick
}

interface SettingsMenuProps {
    location?: 'top-left' | 'top-center' // default top-left
}

export const SettingsMenu = (props: SettingsMenuProps) => {
    const { location } = props

    const [errorMessage, setErrorMessage] = useState<string>('')
    const [showToast, setShowToast] = useState<boolean>(false)
    const eventsFirestore = useEventsFirestore({
        select: (data) => data.id,
    })
    const [creatingEvent, setCreatingEvent] = useState<boolean>(false)
    const [createEventValue, setCreateEventValue] = useState<string>('')
    const [createEventValueValid, setCreateEventValueValid] = useState<boolean>(false)

    const { screen, setScreen } = useSessionManagerStore()
    const wrapperRef = useRef<HTMLDivElement>(null)
    const settings = useSettingsStore()
    const isOpen = settings.isOpen
    const setIsOpen = settings.setIsOpen
    const {
        enableHighPerformanceMode,
        toggleHighPerformanceMode,
        enableSounds,
        toggleSounds,
        sessionTimeoutSeconds,
        setSessionTimeoutSeconds,
        locale,
        setLocale,
        resetToDefaults,
        speechContinuous,
        setSpeechContinuous,
        // Camera settings
        selectedCameraId,
        setSelectedCameraId,
        cameraDevices,
        setCameraDevices,
        cameraFacingMode,
        setCameraFacingMode,
        cameraMirrored,
        setCameraMirrored,
    } = settings

    // Enumerate camera devices when settings menu opens
    useEffect(() => {
        if (!isOpen) return

        const enumerateDevices = async () => {
            try {
                // Request permission first (needed to get device labels)
                await navigator.mediaDevices.getUserMedia({ video: true }).then((stream) => {
                    // Stop the stream immediately, we just needed permission
                    for (const track of stream.getTracks()) {
                        track.stop()
                    }
                })

                const devices = await navigator.mediaDevices.enumerateDevices()
                const videoDevices = devices
                    .filter((d) => d.kind === 'videoinput')
                    .map((d) => ({
                        deviceId: d.deviceId,
                        label: d.label || `Camera ${d.deviceId.slice(0, 8)}`,
                    }))
                setCameraDevices(videoDevices)
            } catch (e) {
                console.error('Error enumerating camera devices:', e)
            }
        }

        enumerateDevices()
    }, [isOpen, setCameraDevices])

    const isDefaults = useMemo(
        () =>
            Object.entries(DEFAULT_SETTINGS).every(([key, value]) => {
                return value === settings[key as keyof typeof settings]
            }),
        [settings],
    )

    const handleMultiClick = useMultiClick(() => {
        setIsOpen(!isOpen)
    })

    // biome-ignore lint/correctness/useExhaustiveDependencies: not the fn, just the bool
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (
                (e.ctrlKey && e.shiftKey && e.code === 'KeyC') ||
                (e.ctrlKey && e.altKey && e.code === 'KeyC')
            ) {
                setIsOpen(!isOpen)
            }
        }

        window.document.addEventListener('keypress', handleKeyPress)

        return () => {
            window.document.removeEventListener('keypress', handleKeyPress)
        }
    }, [isOpen])

    // biome-ignore lint/correctness/useExhaustiveDependencies: no thanks
    useEffect(() => {
        const scrimClickHandler = (e: MouseEvent | TouchEvent) => {
            if (e.target === wrapperRef.current) {
                setIsOpen(false)
            }
        }
        if (wrapperRef.current) {
            wrapperRef.current.addEventListener('mousedown', scrimClickHandler)
            wrapperRef.current.addEventListener('touchstart', scrimClickHandler)
        }
        return () => {
            if (wrapperRef.current) {
                wrapperRef.current.removeEventListener('mousedown', scrimClickHandler)
                wrapperRef.current.removeEventListener('touchstart', scrimClickHandler)
            }
        }
    }, [wrapperRef.current, isOpen])

    useEffect(() => {
        const regex = /^[a-zA-Z0-9-]*$/
        const charactersValid = regex.test(createEventValue)
        const lengthValid = createEventValue.length >= 4 && createEventValue.length <= 24
        if (charactersValid && lengthValid) {
            setCreateEventValueValid(true)
        } else {
            setCreateEventValueValid(false)
        }
    }, [createEventValue])

    // biome-ignore lint/correctness/useExhaustiveDependencies: only run once
    useEffect(() => {
        if (process.env.NEXT_PUBLIC_ENV === 'prod' && settings.eventId === 'default') {
            setErrorMessage(
                'Event is set to default. Use settings menu to create/select your event!',
            )
            setShowToast(true)
        }
    }, [])

    useEffect(() => {
        if (process.env.NEXT_PUBLIC_ENV === 'prod' && settings.eventId === 'default') {
            setErrorMessage(
                'Event is set to default. Use settings menu to create/select your event!',
            )
            setShowToast(true)
        }
    }, [settings.eventId])

    return (
        <>
            {!isOpen && (
                <button
                    data-location={location}
                    className={styles.trigger}
                    onClick={handleMultiClick}
                    type='button'
                    aria-label='Triple-click to open settings'
                />
            )}
            {!isOpen && (
                <button
                    data-location={location}
                    className={styles.triggerOutside}
                    onClick={handleMultiClick}
                    type='button'
                    aria-label='Triple-click to open settings'
                />
            )}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={styles.wrapper}
                        data-theme='dark'
                        {...menuMotionProps}
                        ref={wrapperRef}>
                        <div className={styles.container}>
                            <MdFilledIconButton
                                className={styles.closeButton}
                                onClick={() => setIsOpen(false)}>
                                <MdIcon icon='close' />
                            </MdFilledIconButton>
                            <div className={styles.settingsTitle}>__PROJECT_NAME__</div>
                            <div className={styles.logoBug}>
                                <span>Demos & Experiments</span> <GoogleCloudLockup />
                            </div>
                            <div className={styles.scrollingArea}>
                                <div className={styles.inner}>
                                    <div className={styles.columnGrow}>
                                        <PromptEditor />
                                    </div>
                                    <div className={styles.column}>
                                        <SettingsMenuSection
                                            title='⚙️ Demo Settings'
                                            collapsible={false}>
                                            <Installer />

                                            <div className={styles.setting}>
                                                <label
                                                    htmlFor='high-performance-mode'
                                                    className={styles.settingLabel}>
                                                    <MdSwitch
                                                        id='high-performance-mode'
                                                        selected={enableHighPerformanceMode}
                                                        onChange={toggleHighPerformanceMode}
                                                        icons>
                                                        <MdIcon
                                                            filled={false}
                                                            icon='speed'
                                                            slot='on-icon'
                                                        />
                                                        <MdIcon
                                                            filled={false}
                                                            icon='energy_savings_leaf'
                                                            slot='off-icon'
                                                        />
                                                    </MdSwitch>
                                                    <span>High Performance Mode</span>
                                                </label>
                                            </div>

                                            <div className={styles.setting}>
                                                <MdFilledTextField
                                                    id='event-name'
                                                    value={createEventValue}
                                                    placeholder={'New event'}
                                                    errorText={
                                                        'Letters, numbers, and dashes only. Between 4-24 characters.'
                                                    }
                                                    minLength={4}
                                                    maxLength={24}
                                                    error={
                                                        !createEventValueValid &&
                                                        createEventValue !== ''
                                                    }
                                                    onInput={(_e) => {
                                                        // @ts-expect-error
                                                        const val = _e.target.value as string
                                                        setCreateEventValue(val)
                                                    }}
                                                />
                                                <Button
                                                    disabled={
                                                        !createEventValueValid || creatingEvent
                                                    }
                                                    onClick={async () => {
                                                        setCreatingEvent(true)
                                                        const result = await EventCreateApi.fetch({
                                                            id: createEventValue,
                                                        })
                                                        if (result && !result.error) {
                                                            setCreateEventValue('')
                                                        }
                                                        setCreatingEvent(false)
                                                    }}>
                                                    Create
                                                </Button>
                                            </div>

                                            <MdSelect
                                                value={settings.eventId}
                                                onChange={(value) => {
                                                    settings.setEventId(value)
                                                }}
                                                options={eventsFirestore?.data ?? ['default']}
                                                id='event-select'
                                                label='Event'
                                            />

                                            <div className={styles.setting}>
                                                <label
                                                    htmlFor='enable-sounds'
                                                    className={styles.settingLabel}>
                                                    <MdSwitch
                                                        id='enable-sounds'
                                                        selected={enableSounds}
                                                        onChange={toggleSounds}
                                                        icons>
                                                        <MdIcon icon='volume_up' slot='on-icon' />
                                                        <MdIcon icon='volume_off' slot='off-icon' />
                                                    </MdSwitch>
                                                    <span>Sounds</span>
                                                </label>
                                            </div>

                                            <MdSelect
                                                value={
                                                    LANGUAGES.find((t) => t.languageCode === locale)
                                                        ?.label ?? 'English'
                                                }
                                                onChange={(value) => {
                                                    const t = LANGUAGES.find(
                                                        (t) => t.label === value,
                                                    )
                                                    if (t) {
                                                        setLocale(t.languageCode)
                                                    } else {
                                                        setLocale('en_US')
                                                    }
                                                }}
                                                options={LANGUAGES.map((t) => t.label)}
                                                id='language-select'
                                                label='Language'
                                            />

                                            <div className={styles.setting}>
                                                <label
                                                    htmlFor='speech-continuous'
                                                    className={styles.settingLabel}>
                                                    <MdSwitch
                                                        id='speech-continuous'
                                                        selected={speechContinuous}
                                                        onChange={() =>
                                                            setSpeechContinuous(!speechContinuous)
                                                        }
                                                        icons>
                                                        <MdIcon icon='mic' slot='on-icon' />
                                                        <MdIcon icon='mic' slot='off-icon' />
                                                    </MdSwitch>
                                                    <span>
                                                        Speech-to-text: Continuous{' '}
                                                        <small>
                                                            (
                                                            {speechContinuous
                                                                ? 'keeps listening'
                                                                : 'stops on silence'}
                                                            )
                                                        </small>
                                                    </span>
                                                </label>
                                            </div>

                                            <MdSelect
                                                value={
                                                    selectedCameraId ||
                                                    (cameraFacingMode === 'user'
                                                        ? 'front'
                                                        : 'environment')
                                                }
                                                onChange={(value) => {
                                                    if (value === 'front') {
                                                        setSelectedCameraId('')
                                                        setCameraFacingMode('user')
                                                    } else if (value === 'environment') {
                                                        setSelectedCameraId('')
                                                        setCameraFacingMode('environment')
                                                    } else {
                                                        setSelectedCameraId(value)
                                                    }
                                                }}
                                                options={[
                                                    {
                                                        group: 'Defaults',
                                                        options: isMobile()
                                                            ? [
                                                                  {
                                                                      label: 'Front Camera (User)',
                                                                      value: 'front',
                                                                  },
                                                                  {
                                                                      label: 'Back Camera (Environment)',
                                                                      value: 'environment',
                                                                  },
                                                              ]
                                                            : [
                                                                  {
                                                                      label: 'System default',
                                                                      value: 'default',
                                                                  },
                                                              ],
                                                    },
                                                    ...(cameraDevices.length > 0
                                                        ? [
                                                              {
                                                                  group: 'Available Devices',
                                                                  options: cameraDevices.map(
                                                                      (d) => ({
                                                                          label: d.label,
                                                                          value: d.deviceId,
                                                                      }),
                                                                  ),
                                                              },
                                                          ]
                                                        : []),
                                                ]}
                                                id='camera-select'
                                                label='Camera'
                                            />

                                            <div className={styles.setting}>
                                                <label
                                                    htmlFor='camera-mirrored'
                                                    className={styles.settingLabel}>
                                                    <MdSwitch
                                                        id='camera-mirrored'
                                                        selected={cameraMirrored}
                                                        onChange={() =>
                                                            setCameraMirrored(!cameraMirrored)
                                                        }
                                                        icons>
                                                        <MdIcon icon='flip' slot='on-icon' />
                                                        <MdIcon icon='flip' slot='off-icon' />
                                                    </MdSwitch>
                                                    <span>Camera: Mirror (flip horizontally)</span>
                                                </label>
                                            </div>

                                            <div className={styles.setting}>
                                                <label
                                                    htmlFor='session-timeout-slider'
                                                    className={styles.settingLabel}>
                                                    <span>
                                                        Session Timeout (
                                                        {Math.round(sessionTimeoutSeconds / 15) / 4}{' '}
                                                        minutes)
                                                    </span>
                                                    <MdSlider
                                                        id='session-timeout-slider'
                                                        value={sessionTimeoutSeconds / 60}
                                                        onChange={(value) =>
                                                            setSessionTimeoutSeconds(value * 60)
                                                        }
                                                        min={0.25}
                                                        max={15}
                                                        step={0.25}
                                                        labeled
                                                    />
                                                </label>
                                            </div>

                                            <div className={styles.setting}>
                                                <label
                                                    htmlFor='vacant'
                                                    className={styles.settingLabel}>
                                                    <MdSwitch
                                                        id='vacant'
                                                        selected={screen === 'Vacant'}
                                                        onChange={() => {
                                                            if (screen === 'Vacant') {
                                                                setScreen('Home')
                                                            } else {
                                                                setScreen('Vacant')
                                                            }
                                                        }}
                                                        icons>
                                                        <MdIcon
                                                            icon='beach_access'
                                                            slot='on-icon'
                                                        />
                                                        <MdIcon
                                                            icon='beach_access'
                                                            slot='off-icon'
                                                        />
                                                    </MdSwitch>
                                                    <span>Set to Away</span>
                                                </label>
                                            </div>

                                            <Button
                                                className={styles.resetButton}
                                                disabled={isDefaults}
                                                onClick={() => {
                                                    setCreateEventValue('')
                                                    resetToDefaults()
                                                }}
                                                icon='refresh'
                                                size='small'
                                                iconPosition='left'>
                                                Reset Defaults
                                            </Button>
                                        </SettingsMenuSection>
                                    </div>
                                    {process.env.NEXT_PUBLIC_ENV === 'dev' && (
                                        <div className={styles.column}>
                                            <SettingsMenuSection
                                                title='🧑‍💻 Dev'
                                                collapsible={false}>
                                                <div className={styles.setting}>
                                                    <MdSelect
                                                        label='Current Screen'
                                                        value={screen}
                                                        onChange={setScreen}
                                                        options={screenKeys}
                                                        id='current-screen-input'
                                                    />
                                                </div>
                                            </SettingsMenuSection>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {showToast && (
                <Toast
                    onDismiss={() => {
                        setShowToast(false)
                    }}
                    id='start-session-error-toast'
                    title={errorMessage}
                    type='error'
                    actions={[
                        {
                            label: 'Settings',
                            variant: 'filled',
                            onClick: () => {
                                setShowToast(false)
                                setIsOpen(true)
                            },
                        },
                    ]}
                />
            )}
            <ToastProvider position='bottom' />
        </>
    )
}
