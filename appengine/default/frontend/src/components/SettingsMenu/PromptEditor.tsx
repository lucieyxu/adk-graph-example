import * as AllGenApisObj from '@shared/ts/apis/genApis.ts'
import { MdSelect } from '@shared/ts/components/MdSelect/index.ts'
import type { GenApiGeneric } from '@shared/ts/lib/api.ts'
import { MdOutlinedTextField } from '@shared/ts/lib/material.ts'
import { downloadStringAsTxt } from '@shared/ts/lib/utils.ts'
import type { ListGenApisOutput, ModelCategory } from '@shared/types/general.ts'
import { useGenApisStore } from '@src/stores/genApisStore.ts'
import { useSettingsStore } from '@src/stores/settingsStore.ts'
import { useEffect, useState } from 'react'
import { Button } from '../Button/index.ts'
import styles from './PromptEditor.module.scss'
import { SettingsMenuSection } from './SettingsMenuSection.tsx'

interface ApiTabProps {
    selected: boolean
    changed: boolean
    name: string
    url: string
    handleClick: (url: string) => void
}

const NavButton = (props: ApiTabProps) => {
    const { selected, changed, name, url, handleClick } = props

    return (
        <Button
            onClick={() => {
                if (selected) {
                    handleClick('')
                } else {
                    handleClick(url)
                }
            }}
            size='small'
            icon={changed ? 'edit' : null} // 'check_box'}
            iconPosition='right'
            iconSize='40rem'
            // iconSize='small'
            color={!changed ? 'white' : 'blue'}
            variant={selected ? 'primary' : 'secondary'}>
            {name}
        </Button>
    )
}

const AllGenApis: Array<GenApiGeneric> = Object.keys(AllGenApisObj)
    // @ts-expect-error import all top level objects into array
    .map((k) => AllGenApisObj[k] as GenApiGeneric)

export const PromptEditor = () => {
    const isProd = process.env.NEXT_PUBLIC_ENV === 'prod'

    const { promptOverrides, setPromptOverride, modelOverrides, setModelOverride } =
        useSettingsStore()

    const allModels = (useGenApisStore().data as ListGenApisOutput | undefined)?.models

    const [selectedTab, setSelectedTab] = useState<string>('')

    const genApis = AllGenApis.filter((a) => a.isGenApi && a.synced)

    const handleTabClick = (url: string) => {
        setSelectedTab(url)
    }

    const activeApi = genApis.find((x) => selectedTab !== '' && selectedTab === x.url)

    const promptOverride = activeApi && !isProd ? promptOverrides[activeApi.url] : undefined
    const prompt = promptOverride ?? activeApi?.prompt

    const modelOverride = activeApi ? modelOverrides[activeApi.url] : undefined

    const model = modelOverride ?? activeApi?.preferredModel

    // POPULATE model options based on allowed model categories
    const modelOptions: Array<string> = []
    if (allModels && activeApi) {
        let k: keyof typeof allModels
        for (k in allModels) {
            if (activeApi.compatibleModelCategories.indexOf(k as ModelCategory) >= 0) {
                allModels[k].forEach((m) => {
                    modelOptions.push(m.name)
                })
            }
        }
    } else {
        modelOptions.push('')
    }

    const unchanged = prompt === activeApi?.prompt && model === activeApi?.preferredModel

    const promptSubstitutions: Array<[string, string]> = activeApi
        ? activeApi.promptSubstitutions
        : []

    // LOCAL state to ensure re-renders
    const [uiModel, setUiModel] = useState<string>('')
    useEffect(() => {
        setUiModel(model ?? '')
    }, [model])

    return (
        <SettingsMenuSection title='👾 Prompts & Models' collapsible={false}>
            <div className={styles.nav}>
                {genApis.map((x) => (
                    <NavButton
                        key={`prompt-editor-nav-button-${x.name}`}
                        name={x.name}
                        url={x.url}
                        changed={x.promptOverride !== undefined || x.modelOverride !== undefined}
                        selected={selectedTab === x.url}
                        handleClick={handleTabClick}
                    />
                ))}
            </div>
            <div className={styles.description} data-populated={activeApi !== undefined}>
                {activeApi?.description ?? 'Select an API endpoint above'}
            </div>
            <div className={styles.editor}>
                <MdOutlinedTextField
                    value={prompt ?? ''}
                    disabled={!activeApi || isProd}
                    className={styles.prompt}
                    type='textarea'
                    label={'Prompt'}
                    placeholder='Select an endpoint'
                    // rows={14}
                    style={{ resize: 'none' }}
                    onChange={(e) => {
                        if (!activeApi || isProd) return
                        const t = e.target as unknown as { value: string }
                        if (t.value.trim() !== activeApi.prompt?.trim()) {
                            setPromptOverride(activeApi.url, t.value)
                            activeApi.promptOverride = t.value
                        } else {
                            setPromptOverride(activeApi.url, '')
                            activeApi.promptOverride = undefined
                        }
                    }}></MdOutlinedTextField>
                <div className={styles.column}>
                    <MdSelect
                        value={uiModel}
                        onChange={(value) => {
                            if (!activeApi) return
                            if (value !== activeApi.preferredModel) {
                                setModelOverride(activeApi.url, value)
                                activeApi.modelOverride = value
                            } else {
                                setModelOverride(activeApi.url, '')
                                activeApi.modelOverride = undefined
                            }
                        }}
                        disabled={!activeApi}
                        options={modelOptions}
                        id='model-select'
                        label='Model'
                    />

                    <div className={styles.infos}>
                        <div className={styles.subhead}>{activeApi ? 'Template Values' : ''}</div>
                        {promptSubstitutions.map((p) => (
                            <div key={`prompt-editor-pair-${p[0]}`} className={styles.subPair}>
                                <span>__{p[0]}__</span>
                                <span>{p[1]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <div className={styles.toolbar}>
                <Button
                    disabled={unchanged || !activeApi}
                    onClick={() => {
                        if (!activeApi) return
                        setModelOverride(activeApi.url, '')
                        activeApi.modelOverride = undefined
                        setPromptOverride(activeApi.url, '')
                        activeApi.promptOverride = undefined
                    }}
                    size='small'
                    icon='refresh'
                    iconPosition='left'>
                    Reset
                </Button>
                {!isProd && (
                    <Button
                        disabled={unchanged || !activeApi}
                        onClick={() => {
                            if (!activeApi) return
                            downloadStringAsTxt(
                                `Prompt: ${prompt}\n\nModel: ${model}`,
                                `Genapi-Config-${activeApi.name}`,
                            )
                        }}
                        size='small'
                        icon='download'
                        iconPosition='left'>
                        Export
                    </Button>
                )}
            </div>
        </SettingsMenuSection>
    )
}
