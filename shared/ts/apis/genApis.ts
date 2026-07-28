import { useUrls } from '@shared/ts/hooks/useUrls.ts'
import { GenApi } from '@shared/ts/lib/api.ts'
import { ShoppingInputZ, ShoppingOutputZ } from '@shared/types/genapis/shopping.ts'
import { VisualizeInputZ, VisualizeOutputZ } from '@shared/types/genapis/visualize.ts'

// biome-ignore lint/correctness/useHookAtTopLevel: safe for use outside of react
const urls = useUrls()

export const ShoppingGenApi = new GenApi({
    name: 'Shopping',
    description: 'Generate a shopping list for a variety of scenarios',
    url: `${urls.appengineDefaultBackend}/api/genapis/shopping`,
    input: ShoppingInputZ,
    output: ShoppingOutputZ,
})

export const VisualizeGenApi = new GenApi({
    name: 'Visualize',
    description: 'Generate an image of our character after shopping, on their adventure',
    url: `${urls.appengineDefaultBackend}/api/genapis/visualize`,
    input: VisualizeInputZ,
    output: VisualizeOutputZ,
})
