'use client'
import * as AllApisObj from '@shared/ts/apis/genApis.ts'
import { GenApisListApi } from '@shared/ts/apis/general.ts'
import { colorsRaw } from '@shared/ts/colors/index.ts'
import type { GenApiGeneric } from '@shared/ts/lib/api.ts'
import { logStyled } from '@shared/ts/lib/utils.ts'
import { ToastProvider } from '@src/components/Toast/index.tsx'
import { Toast } from '@src/components/Toast/Toast.tsx'
import { useContent } from '@src/content/index.ts'
import { useGenApisStore } from '@src/stores/genApisStore.ts'
import { useSettingsStore } from '@src/stores/settingsStore.ts'
import type { PropsWithChildren } from 'react'
import { useEffect, useState } from 'react'

let requesting = false

export const GenApisProvider = ({ children }: PropsWithChildren) => {
    const isProd = process.env.NEXT_PUBLIC_ENV === 'prod'
    const c = useContent().settings
    const genApisStore = useGenApisStore()
    const { promptOverrides, modelOverrides, resetAllOverrides, setIsOpen } = useSettingsStore()
    const [showToast, setShowToast] = useState<boolean>(false)

    // biome-ignore lint/correctness/useExhaustiveDependencies: only run once
    useEffect(() => {
        if (requesting || genApisStore.requesting) return
        requesting = true
        genApisStore.setRequesting(true)
        const task = async () => {
            const result = await GenApisListApi.fetch()
            if (!result || result.error) {
                genApisStore.setError(true)
                genApisStore.setData(null)
            } else {
                genApisStore.setError(false)
                genApisStore.setData(result)

                let validCount = 0

                // FRONTEND defined genapi endpoints
                const FrontendGenApis: Array<GenApiGeneric> = Object.keys(AllApisObj)
                    // @ts-expect-error import all top level objects into array
                    .map((k) => AllApisObj[k])
                    .filter((a) => a.isGenApi)

                // SERVER defined genapi endpoints
                const BackendGenApis = result.genApis
                BackendGenApis.forEach((b) => {
                    const f = FrontendGenApis.find((x) => x.url === b.url)
                    if (!f) {
                        console.log(
                            ...logStyled(
                                [
                                    'GenApis',
                                    '⚠️⚠️⚠️ Warning! ⚠️⚠️⚠️ Server specified GenApi endpoint that is not defined in frontend!',
                                    'This must be fixed. Create a frontend Api instance (with isGenApi set to true) for:',
                                    b.url,
                                    'See /shared/ts/apis/genApis.ts for examples.',
                                ],
                                {
                                    backgroundColor: colorsRaw['green-300'],
                                },
                            ),
                        )
                    } else {
                        f.sync({
                            prompt: b.prompt,
                            preferredModel: b.preferredModel,
                            compatibleModelCategories: b.compatibleModelCategories,
                            promptSubstitutions: b.promptSubstitutions as Array<[string, string]>,
                        })
                        if (promptOverrides[f.url] && !isProd) {
                            // ENHANCEMENT: show toast if staging and using prompt override on page
                            // load, suggest to reset to defaults
                            f.promptOverride = promptOverrides[f.url]
                        }
                        if (modelOverrides[f.url]) {
                            // ENHANCEMENT: show toast if staging and using model override on page
                            // load, suggest to reset to defaults
                            f.modelOverride = modelOverrides[f.url]
                        }
                        validCount++
                    }
                })

                FrontendGenApis.forEach((f) => {
                    const b = BackendGenApis.find((x) => x.url === f.url)
                    if (!b) {
                        console.log(
                            ...logStyled(
                                [
                                    'GenApis',
                                    '⚠️⚠️⚠️ Warning! ⚠️⚠️⚠️ Frontend specified an Api instance (with isGenApi set to true) that is not defined in backend!',
                                    'This must be fixed. Create a backend GenApi instance for:',
                                    f.url,
                                    'See /app/backend/src/examples.py for examples, or search for instances of the class "GenApi"',
                                ],
                                {
                                    backgroundColor: colorsRaw['green-300'],
                                },
                            ),
                        )
                    }
                })

                console.log(
                    ...logStyled(
                        [
                            'GenApis',
                            `Synced ${validCount} endpoint${validCount === 1 ? '' : 's'} with prompts & models`,
                        ],
                        {
                            backgroundColor: colorsRaw['green-300'],
                        },
                    ),
                )
            }
            requesting = false
            genApisStore.setRequesting(false)
        }
        task()
    }, [])

    const containsModelOverrides = Object.keys(modelOverrides).length > 0
    const containsPromptOverrides = Object.keys(promptOverrides).length > 0

    let warningMessage = ''
    if (containsModelOverrides && containsPromptOverrides) {
        warningMessage = c.promptAndModelOverride
    } else if (containsPromptOverrides) {
        warningMessage = c.promptOverride
    } else if (containsModelOverrides) {
        warningMessage = c.modelOverride
    }

    // biome-ignore lint/correctness/useExhaustiveDependencies: only change after initial fetch
    useEffect(() => {
        if (
            !genApisStore.requesting &&
            (containsModelOverrides || containsPromptOverrides) &&
            !showToast
        ) {
            setTimeout(() => {
                setShowToast(true)
            }, 1000)
        }
    }, [genApisStore.requesting])

    return (
        <>
            {children}
            {showToast && (
                <Toast
                    id='genapi-prompt-override-warning-toast'
                    title={'GenApi'}
                    description={warningMessage}
                    type='warning'
                    duration={5000}
                    onDismiss={() => {
                        setShowToast(false)
                    }}
                    actions={[
                        {
                            label: c.viewOverridesCta,
                            variant: 'filled',
                            onClick: () => {
                                setShowToast(false)
                                setIsOpen(true)
                            },
                        },
                        {
                            label: c.resetOverrideCta,
                            variant: 'filled',
                            onClick: () => {
                                setShowToast(false)
                                resetAllOverrides()
                            },
                        },
                    ]}
                />
            )}
            <ToastProvider position='bottom' />
        </>
    )
}
