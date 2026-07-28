import type { MergeDeep } from '@shared/types/util.ts'
import { cloneDeep, merge } from 'lodash'

/**
 * This uses `merge` and `cloneDeep` from lodash to merge two objects of the
 * same type into a new object.
 *
 * Recursively merges own and inherited enumerable properties of source
 * objects into the destination object, skipping source properties that resolve
 * to `undefined`. Array and plain object properties are merged recursively.
 * Other objects and value types are overridden by assignment. Source objects
 * are applied from left to right. Subsequent sources overwrite property
 * assignments of previous sources.
 */
export const mergeToClone = <A extends object, B extends object>(
    firstArg: A,
    ...rest: B[]
): MergeDeep<A, B> => merge(cloneDeep(firstArg), ...rest)
