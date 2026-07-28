import type { ListGenApisOutput } from '@shared/types/general.ts'
import { create } from 'zustand'

type GenApisStore = {
    requesting: boolean
    setRequesting: (requesting: boolean) => void
    data: ListGenApisOutput | null
    setData: (data: ListGenApisOutput | null) => void
    error: boolean
    setError: (requesting: boolean) => void
}

export const useGenApisStore = create<GenApisStore>((set) => ({
    requesting: false,
    setRequesting: (requesting: boolean) => set((state) => ({ ...state, requesting })),
    data: null,
    setData: (data: ListGenApisOutput | null) => set((state) => ({ ...state, data })),
    error: false,
    setError: (error: boolean) => set((state) => ({ ...state, error })),
}))
