import { ShoppingGenApi } from '@shared/ts/apis/genApis.ts'
import { MdCircularProgress, MdOutlinedTextField } from '@shared/ts/lib/material.ts'
import { Button } from '@src/components/Button/index.ts'
import { Stage } from '@src/components/Stage/index.tsx'
import { ToastProvider } from '@src/components/Toast/index.tsx'
import { Toast } from '@src/components/Toast/Toast.tsx'
import { useSessionManagerStore } from '@src/stores/sessionManagerStore.ts'
import { useSessionStore } from '@src/stores/sessionStore.ts'
import { useSettingsStore } from '@src/stores/settingsStore.ts'

import { useState } from 'react'
import styles from './Shopping.module.scss'

export const Shopping = () => {
    const {
        characterName,
        setCharacterName,
        characterType,
        setCharacterType,
        eventType,
        setEventType,
        spendingLimit,
        setSpendingLimit,
        minItems,
        setMinItems,
        maxItems,
        setMaxItems,
        shoppingOutput,
        setShoppingOutput,
    } = useSessionStore()
    const { id } = useSessionManagerStore()
    const { eventId } = useSettingsStore()
    const [generating, setGenerating] = useState<boolean>(false)
    const [showToast, setShowToast] = useState<boolean>(false)
    const [error, setError] = useState<string>('')

    const generate = async () => {
        setShoppingOutput(null)
        setGenerating(true)
        setShowToast(false)
        const result = await ShoppingGenApi.fetch({
            sessionId: id,
            eventId: eventId,
            values: {
                characterName,
                characterType,
                eventType,
                spendingLimit,
                minItems,
                maxItems,
            },
        })
        if (!result) {
            setError('No response from server')
            if (result) setShowToast(true)
        } else if (result.error) {
            setError(result.message)
            if (result) setShowToast(true)
        } else {
            setShoppingOutput(result)
        }
        setGenerating(false)
    }

    return (
        <Stage>
            <div className={styles.stage}>
                <div className={styles.form}>
                    <MdOutlinedTextField
                        label='Character Name'
                        value={characterName}
                        onChange={(e) => {
                            const t = e.target as unknown as { value: string }
                            setCharacterName(t.value)
                        }}
                        style={{ width: '100%' }}
                    />
                    <MdOutlinedTextField
                        label='Character Type'
                        value={characterType}
                        onChange={(e) => {
                            const t = e.target as unknown as { value: string }
                            setCharacterType(t.value)
                        }}
                        style={{ width: '100%' }}
                    />
                    <MdOutlinedTextField
                        label='Event Type'
                        value={eventType}
                        onChange={(e) => {
                            const t = e.target as unknown as { value: string }
                            setEventType(t.value)
                        }}
                        style={{ width: '100%' }}
                    />
                    <MdOutlinedTextField
                        label='Spending Limit'
                        value={String(spendingLimit)}
                        type='number'
                        prefixText='$'
                        onChange={(e) => {
                            const t = e.target as unknown as { value: string }
                            setSpendingLimit(parseInt(t.value))
                        }}
                        style={{ width: '100%' }}
                    />
                    <MdOutlinedTextField
                        label='Minimum Items'
                        value={String(minItems)}
                        type='number'
                        onChange={(e) => {
                            const t = e.target as unknown as { value: string }
                            setMinItems(parseInt(t.value))
                        }}
                        style={{ width: '100%' }}
                    />
                    <MdOutlinedTextField
                        label='Maximum Items'
                        value={String(maxItems)}
                        type='number'
                        onChange={(e) => {
                            const t = e.target as unknown as { value: string }
                            setMaxItems(parseInt(t.value))
                        }}
                        style={{ width: '100%' }}
                    />
                </div>
                <Button
                    color='blue'
                    onClick={() => {
                        if (!generating) generate()
                    }}
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
                <div className={styles.result}>
                    <div className={styles.resultInner}>
                        <p>Summary: {shoppingOutput?.summary ?? '--'}</p>
                        <p>Total Price: ${shoppingOutput?.totalPrice ?? '--'}</p>
                        {shoppingOutput?.list.map((item, index) => {
                            return (
                                <ShoppingItem
                                    key={`shopping-item-${index}-${item.itemName}`}
                                    itemName={item.itemName}
                                    quantity={item.quantity}
                                    totalPrice={item.totalPrice}
                                />
                            )
                        })}
                    </div>
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

interface ShoppingItemProps {
    itemName: string
    totalPrice: number
    quantity: number
}

const ShoppingItem = ({ itemName, totalPrice, quantity }: ShoppingItemProps) => {
    return (
        <div className={styles.item}>
            <p>Item: {itemName}</p>
            <p>Price: ${totalPrice}</p>
            <p>Qty: {quantity}</p>
        </div>
    )
}
