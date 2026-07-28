import { MdSliderBase, type WebComponentMdSlider } from '@shared/ts/lib/material.ts'
import type React from 'react'
import type { ComponentProps } from 'react'

interface MdSliderProps extends Omit<ComponentProps<typeof MdSliderBase>, 'onChange'> {
    onChange?: (value: number, end?: number) => void
    ref?: React.RefObject<WebComponentMdSlider>
}

/**
 * Material Web Slider component.
 *
 * @prop {number}   min                 The slider minimum value. Default: 0
 * @prop {number}   max                 The slider maximum value. Default: 100
 * @prop {number}   value               The slider value displayed when `range` is false. Default: undefined
 * @prop {number}   valueStart          The slider start value displayed when `range` is true. Default: undefined
 * @prop {number}   valueEnd            The slider end value displayed when `range` is true. Default: undefined
 * @prop {number}   step                The step between values. Default: 1
 * @prop {boolean}  ticks               Whether or not to show tick marks. Default: false
 * @prop {boolean}  labeled             Whether or not to show a value label when activated. Default: false
 * @prop {boolean}  range               Whether or not to show a value range. When false, the slider displays a slideable handle for the `value` property; when true, it displays slideable handles for the `valueStart` and `valueEnd` properties. Default: false
 * @prop {boolean}  disabled            Disables the slider. Default: undefined
 * @prop {string}   name                Name of the slider for form submission. Default: undefined
 * @prop {string}   nameStart           Name of the start value for form submission (when `range` is true). Default: undefined
 * @prop {string}   nameEnd             Name of the end value for form submission (when `range` is true). Default: undefined
 *
 * @see https://github.com/material-components/material-web/blob/70a1d8e59a127df886819197f24d76bf96524196/docs/components/slider.md
 */
export const MdSlider = (props: MdSliderProps) => {
    const { onChange, ref, range, ...rest } = props

    return (
        <MdSliderBase
            {...rest}
            ref={ref as React.RefObject<WebComponentMdSlider>}
            range={range}
            onChange={(e) => {
                if (range) {
                    const valueStart = Number((e.target as WebComponentMdSlider).valueStart)
                    const valueEnd = Number((e.target as WebComponentMdSlider).valueEnd)
                    onChange?.(valueStart, valueEnd)
                } else {
                    const value = Number((e.target as WebComponentMdSlider).value)
                    onChange?.(value)
                }
            }}
        />
    )
}

MdSlider.displayName = 'MdSlider'
