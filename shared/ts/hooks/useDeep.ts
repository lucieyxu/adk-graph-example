import { equals } from 'ramda'
import { useRef } from 'react'

export const useDeep = <S, T>(selector: (state: S) => T): ((state: S) => T) => {
    const prev = useRef<T>(undefined)
    return (state) => {
        const next = selector(state)
        const isEqual = equals(prev.current, next)
        if (isEqual) {
            return prev.current as T
        } else {
            prev.current = next
            return prev.current
        }
    }
}
