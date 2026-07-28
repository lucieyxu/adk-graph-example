import type { Tuple } from 'types-ramda'

/**
 * Extracts the value of a key from an object or array.
 * @param T The type of the object or array to extract the values from.
 */
export type ValuesOf<T extends object | readonly unknown[]> = T extends readonly unknown[]
    ? T[number]
    : T[keyof T]

/**
 * If a count is provided, returns a tuple of the items with the given count. Otherwise, return an array of the items.
 *
 * @example
 * type carousel = OptionalTuple<3> // -> [Item, Item, Item]
 * type carousel = OptionalTuple // -> Item[]
 */
export type OptionalTuple<
    Item,
    Count extends number | undefined = undefined,
> = Count extends undefined ? Item[] : Count extends number ? Tuple<Item, Count> : never

/**
 * Merges two objects deeply, including support for arrays/tuples and objects within arrays/tuples.
 * @param A The first object to merge.
 * @param B The second object to merge. B will override A in case of conflicts.
 */
export type MergeDeep<A, B> = A extends unknown[]
    ? B extends unknown[]
        ? MergeArrays<A, B>
        : B
    : B extends unknown[]
      ? B
      : A extends object
        ? B extends object
            ? {
                  [Key in keyof A | keyof B]: Key extends keyof A
                      ? Key extends keyof B
                          ? MergeDeep<A[Key], B[Key]>
                          : A[Key]
                      : Key extends keyof B
                        ? B[Key]
                        : never
              }
            : B
        : B

/**
 * Helper type to merge two arrays/tuples by merging their element types.
 * Preserves tuple structure and merges elements at corresponding indices.
 */
type MergeArrays<A extends unknown[], B extends unknown[]> = A extends [
    infer AFirst,
    ...infer ARest,
]
    ? B extends readonly [infer BFirst, ...infer BRest]
        ? [MergeDeep<AFirst, BFirst>, ...MergeArrays<ARest, BRest>]
        : A
    : B

export type NonEmptyRecord<K extends string, T> = Record<K, T> &
    (keyof Record<K, T> extends never ? never : Record<K, T>)
