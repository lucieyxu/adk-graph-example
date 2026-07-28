import type { ShoppingOutput } from '@shared/types/genapis/shopping.ts'
import type { VisualizeOutput } from '@shared/types/genapis/visualize.ts'
import { create } from 'zustand'

type Session = {
    reset: () => void

    // SHOPPING
    characterName: string
    setCharacterName: (characterName: string) => void
    characterType: string
    setCharacterType: (characterName: string) => void
    eventType: string
    setEventType: (characterName: string) => void
    spendingLimit: number
    setSpendingLimit: (spendingLimit: number) => void
    minItems: number
    setMinItems: (minItems: number) => void
    maxItems: number
    setMaxItems: (maxItems: number) => void
    shoppingOutput: ShoppingOutput | null
    setShoppingOutput: (shoppingOutput: ShoppingOutput | null) => void

    // VISUALIZATION
    imageStyle: string
    setImageStyle: (imageStyle: string) => void
    editPrompt: string
    setEditPrompt: (editPrompt: string) => void
    visualizeOutput: VisualizeOutput | null
    setVisualizeOutput: (visualizeOutput: VisualizeOutput | null) => void
}

const DEFAULTS = {
    characterName: 'Tony',
    characterType: 'Tiger',
    eventType: 'Antarctic hunting trip',
    spendingLimit: 100,
    minItems: 5,
    maxItems: 10,
    shoppingOutput: null,
    imageStyle:
        'a photorealistic high fashion magazine, that is also slightly futuristic and sci fi',
    editPrompt: 'make the character driving in the seat of an arctic style buggy instead of skis',
    visualizeOutput: null,
}

export const useSessionStore = create<Session>((set) => ({
    ...DEFAULTS,

    setCharacterName: (characterName: string) => set({ characterName }),
    setCharacterType: (characterType: string) => set({ characterType }),
    setEventType: (eventType: string) => set({ eventType }),
    setSpendingLimit: (spendingLimit: number) => set({ spendingLimit }),
    setMinItems: (minItems: number) => set({ minItems }),
    setMaxItems: (maxItems: number) => set({ maxItems }),
    setShoppingOutput: (shoppingOutput: ShoppingOutput | null) => set({ shoppingOutput }),

    setImageStyle: (imageStyle: string) => set({ imageStyle }),
    setEditPrompt: (editPrompt: string) => set({ editPrompt }),
    setVisualizeOutput: (visualizeOutput: VisualizeOutput | null) => set({ visualizeOutput }),

    reset: () => set({ ...DEFAULTS }),
}))
