import { type OrientationName, viewport } from '@src/styles/constants.ts'
import { atom } from 'jotai'

interface Viewport {
    orientation: OrientationName
    container: HTMLElement | null
    width: (typeof viewport)[OrientationName]['width']
    height: (typeof viewport)[OrientationName]['height']
}

export const viewportAtom = atom<Viewport>({
    orientation: 'landscape',
    container: null,
    width: viewport.landscape.width,
    height: viewport.landscape.height,
})
