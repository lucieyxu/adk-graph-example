import { createComponent } from '@lit/react'
import { MdSlider as MdSliderWebComponent } from '@material/web/slider/slider.js'
import React, { type ComponentProps } from 'react'
import styles from './MdSlider.module.scss'

/**
 * Props for MdSlider:
 *
 * @prop {boolean} selected - Puts the switch in the selected state and sets the form submission value to the value property. Default: false.
 * @prop {boolean} icons - Shows both the selected and deselected icons. Default: false.
 * @prop {boolean} showOnlySelectedIcon - Shows only the selected icon, and not the deselected icon. If true, overrides the behavior of the icons property. Default: false.
 * @prop {boolean} required - When true, require the switch to be selected when participating in form submission. See: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/checkbox#validation. Default: false.
 * @prop {string} value - The value associated with this switch on form submission. Default: 'on'. null is submitted when selected is false.
 * @prop {boolean} disabled - Disables the switch. Default: undefined.
 * @prop {string} name - Name of the switch for form submission. Default: undefined.
 *
 * @see https://github.com/material-components/material-web/blob/70a1d8e59a127df886819197f24d76bf96524196/docs/components/switch.md
 */
export const MdSliderComponent = createComponent({
    tagName: 'md-slider',
    elementClass: MdSliderWebComponent,
    react: React,
})

interface MdSliderProps extends Omit<ComponentProps<typeof MdSliderComponent>, 'onChange'> {
    onChange?: (value: number, end?: number) => void
    ref?: React.RefObject<MdSliderWebComponent>
}

/**
/**
 * MdSlider Props
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
        <MdSliderComponent
            {...rest}
            ref={ref as React.RefObject<MdSliderWebComponent>}
            className={styles.slider}
            range={range}
            onChange={(e) => {
                if (range) {
                    const valueStart = Number((e.target as MdSliderWebComponent).valueStart)
                    const valueEnd = Number((e.target as MdSliderWebComponent).valueEnd)
                    onChange?.(valueStart, valueEnd)
                } else {
                    const value = Number((e.target as MdSliderWebComponent).value)
                    onChange?.(value)
                }
            }}
        />
    )
}

MdSlider.displayName = 'MdSlider'
