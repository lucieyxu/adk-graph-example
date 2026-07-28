/**
 * `dom.ts` contains any utility functions for the DOM querying and manipulation.
 */

/**
 * Gets the cumulative size of the children of an element
 * @param element
 * @param sizeKey - The key to get the size of (`offsetHeight` or `offsetWidth`)
 * @returns The size of the children of the element
 */
export const getSizeOfChildren = (
    element: HTMLElement,
    sizeKey: 'offsetHeight' | 'offsetWidth' = 'offsetHeight',
) => {
    const children = Array.from(element.children) as HTMLElement[]
    return Math.round(children.reduce((total, child) => total + child[sizeKey], 0))
}
