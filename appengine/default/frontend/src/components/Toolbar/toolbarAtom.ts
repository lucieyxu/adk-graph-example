import type { ValuesOf } from '@shared/types/util.ts'
import { atom } from 'jotai'
import type { PropsWithChildren } from 'react'

export const TOOLBAR_POSITIONS = {
    top: 'top',
    bottom: 'bottom',
    left: 'left',
    right: 'right',
} as const

export type ToolbarPosition = ValuesOf<typeof TOOLBAR_POSITIONS>

export interface ToolbarEntry {
    id: string
    children: PropsWithChildren['children']
    order?: number
}

export const toolbarAtom = atom<Record<string, ToolbarEntry>>({})
