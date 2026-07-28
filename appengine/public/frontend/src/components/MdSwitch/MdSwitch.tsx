import { createComponent } from '@lit/react'
import { MdSwitch as MdSwitchWebComponent } from '@material/web/switch/switch.js'

import React from 'react'

/**
 * Props for MdSwitch:
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
export const MdSwitch = createComponent({
    tagName: 'md-switch',
    elementClass: MdSwitchWebComponent,
    react: React,
})

MdSwitch.displayName = 'MdSwitch'
