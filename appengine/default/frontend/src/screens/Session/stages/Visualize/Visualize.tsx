import { VisualizeGenApi } from '@shared/ts/apis/genApis.ts'
import { MdCircularProgress, MdOutlinedTextField } from '@shared/ts/lib/material.ts'
import { gcsUriToReadUrl } from '@shared/ts/lib/storage.ts'
import { Button } from '@src/components/Button/index.ts'
import { Stage } from '@src/components/Stage/index.tsx'
import { ToastProvider } from '@src/components/Toast/index.tsx'
import { Toast } from '@src/components/Toast/Toast.tsx'
import { useSessionFirestore } from '@src/hooks/useSessionFirestore.ts'
import { useSessionManagerStore } from '@src/stores/sessionManagerStore.ts'
import { useSessionStore } from '@src/stores/sessionStore.ts'
import { useSettingsStore } from '@src/stores/settingsStore.ts'

import { useState } from 'react'
import styles from './Visualize.module.scss'

export const Visualize = () => {
    const firestore = useSessionFirestore()

    const {
        characterName,
        characterType,
        eventType,
        shoppingOutput,
        imageStyle,
        setImageStyle,
        editPrompt,
        setEditPrompt,
        visualizeOutput,
        setVisualizeOutput,
    } = useSessionStore()

    const { id } = useSessionManagerStore()
    const { eventId } = useSettingsStore()

    const [generating, setGenerating] = useState<boolean>(false)
    const [editing, setEditing] = useState<boolean>(false)
    const [showToast, setShowToast] = useState<boolean>(false)
    const [error, setError] = useState<string>('')

    const items = !shoppingOutput ? '' : shoppingOutput.list.map((x) => x.itemName).join(', ')
    const imageResult = visualizeOutput?.images[0]?.gcsUri
        ? gcsUriToReadUrl(visualizeOutput.images[0].gcsUri)
        : visualizeOutput?.images[0]?.base64

    const imageResultForEdit = visualizeOutput?.images[0]?.gcsUri
        ? visualizeOutput.images[0].gcsUri
        : visualizeOutput?.images[0]?.base64

    const generate = async () => {
        setVisualizeOutput(null)
        setGenerating(true)
        setShowToast(false)
        if (!shoppingOutput) {
            setError('Cannot make request until shopping list is generated')
            setShowToast(true)
            return
        }
        const result = await VisualizeGenApi.fetch({
            sessionId: id,
            eventId,
            values: {
                characterName,
                characterType,
                eventType,
                imageStyle,
                items,
            },
        })
        if (!result) {
            setError('No response from server')
            if (result) setShowToast(true)
        } else if (result.error) {
            console.error(result.message)
            setError(result.message)
            if (result) setShowToast(true)
        } else {
            // WRITE to firestore
            const gcsUri = result.images[0]?.gcsUri
            if (firestore?.setData && gcsUri) {
                firestore.setData((data) => ({
                    ...data,
                    images: [...data.images, gcsUri],
                }))
            } else {
                console.log('Warning, failed to write image results to Firestore')
            }
            setVisualizeOutput(result)
        }
        setGenerating(false)
    }

    const edit = async () => {
        setVisualizeOutput(null)
        setEditing(true)
        setShowToast(false)
        if (!shoppingOutput) {
            setError('Cannot make request until shopping list is generated')
            setShowToast(true)
            return
        }
        const result = await VisualizeGenApi.fetch({
            sessionId: id,
            eventId,
            values: {
                characterName,
                characterType,
                eventType,
                imageStyle,
                items,
            },
            edit: {
                imageInput: String(imageResultForEdit),
                prompt: editPrompt,
            },
        })
        if (!result) {
            setError('No response from server')
            if (result) setShowToast(true)
        } else if (result.error) {
            console.error(result.message)
            setError(result.message)
            if (result) setShowToast(true)
        } else {
            setVisualizeOutput(result)
        }
        setEditing(false)
    }

    return (
        <Stage>
            <div className={styles.stage}>
                <div className={styles.form}>
                    <MdOutlinedTextField
                        label='Character Name'
                        disabled={true}
                        value={characterName}
                        style={{ width: '100%' }}
                    />
                    <MdOutlinedTextField
                        label='Character Type'
                        value={characterType}
                        disabled={true}
                        style={{ width: '100%' }}
                    />
                    <MdOutlinedTextField
                        label='Event Type'
                        value={eventType}
                        disabled={true}
                        style={{ width: '100%' }}
                    />
                    <MdOutlinedTextField
                        label='Items'
                        value={items}
                        disabled={true}
                        style={{ width: '100%' }}
                    />
                    <MdOutlinedTextField
                        label='Generate new image in the style of...'
                        value={imageStyle}
                        onChange={(e) => {
                            const t = e.target as unknown as { value: string }
                            setImageStyle(t.value)
                        }}
                        style={{ width: '100%' }}
                    />
                    <MdOutlinedTextField
                        label='Edit image with prompt...'
                        value={editPrompt}
                        onChange={(e) => {
                            const t = e.target as unknown as { value: string }
                            setEditPrompt(t.value)
                        }}
                        style={{ width: '100%' }}
                    />
                </div>
                <div className={styles.column}>
                    <Button
                        color='blue'
                        onClick={() => {
                            if (!generating && !editing) generate()
                        }}
                        disabled={editing}
                        iconKey={generating ? 'progress' : 'arrow_forward'}
                        icon={
                            generating ? (
                                <MdCircularProgress
                                    key='progress'
                                    indeterminate
                                    className={styles.buttonProgressIndicator}
                                />
                            ) : (
                                'arrow_forward'
                            )
                        }>
                        Generate
                    </Button>
                    <Button
                        color='blue'
                        onClick={() => {
                            if (!generating && !editing) edit()
                        }}
                        disabled={generating}
                        iconKey={generating ? 'progress' : 'arrow_forward'}
                        icon={
                            editing ? (
                                <MdCircularProgress
                                    key='progress'
                                    indeterminate
                                    className={styles.buttonProgressIndicator}
                                />
                            ) : (
                                'arrow_forward'
                            )
                        }>
                        Edit
                    </Button>
                </div>
                <div className={styles.imageWrapper}>
                    <img
                        src={imageResult && imageResult !== '' ? imageResult : undefined}
                        alt={`${characterName} the ${characterType} on a ${eventType}`}
                    />
                </div>
            </div>
            {showToast && (
                <Toast
                    id='start-session-error-toast'
                    title={error}
                    type='error'
                    duration={10000}
                    dismissability='all'
                />
            )}
            <ToastProvider position='bottom' />
        </Stage>
    )
}
