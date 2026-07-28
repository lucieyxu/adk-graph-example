/**
 * Useful state selector.
 *
 * @example
 * (state) => ({ nuts: state.nuts, honey: state.honey })
 * //or
 * ({ nuts, honey }) => ({ nuts, honey })
 * // can be shortened to:
 * selector('nuts','honey')
 */
export const selector =
    <Obj extends object, Keys extends keyof Obj = keyof Obj>(...keys: Keys[]) =>
    (obj: Obj): Pick<Obj, Keys> =>
        keys.reduce(
            (acc, key) => {
                acc[key] = obj[key]
                return acc
            },
            {} as Pick<Obj, Keys>,
        )
