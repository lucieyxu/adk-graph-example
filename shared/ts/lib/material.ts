/** biome-ignore-all lint/style/useNamingConvention: naming capitalizations are inherited */

// SILENCE dev mode lit warning
;(globalThis as { litIssuedWarnings?: Set<string> }).litIssuedWarnings = new Set([
    'Lit is in dev mode. Not recommended for production! See https://lit.dev/msg/dev-mode for more information.',
])

import { createComponent } from '@lit/react'
import { MdElevatedButton as WebComponentMdElevatedButton } from '@material/web/button/elevated-button'
import { MdFilledButton as WebComponentMdFilledButton } from '@material/web/button/filled-button'
import { MdFilledTonalButton as WebComponentMdFilledTonalButton } from '@material/web/button/filled-tonal-button'
import { MdOutlinedButton as WebComponentMdOutlinedButton } from '@material/web/button/outlined-button'
import { MdTextButton as WebComponentMdTextButton } from '@material/web/button/text-button'
import { MdCheckbox as WebComponentMdCheckbox } from '@material/web/checkbox/checkbox'
import { MdAssistChip as WebComponentMdAssistChip } from '@material/web/chips/assist-chip'
import { MdChipSet as WebComponentMdChipSet } from '@material/web/chips/chip-set'
import { MdFilterChip as WebComponentMdFilterChip } from '@material/web/chips/filter-chip'
import { MdInputChip as WebComponentMdInputChip } from '@material/web/chips/input-chip'
import { MdSuggestionChip as WebComponentMdSuggestionChip } from '@material/web/chips/suggestion-chip'
import { MdDialog as WebComponentMdDialog } from '@material/web/dialog/dialog'
import { MdDivider as WebComponentMdDivider } from '@material/web/divider/divider'
import { MdElevation as WebComponentMdElevation } from '@material/web/elevation/elevation'
import { MdBrandedFab as WebComponentMdBrandedFab } from '@material/web/fab/branded-fab'
import { MdFab as WebComponentMdFab } from '@material/web/fab/fab'
import { MdFilledField as WebComponentMdFilledField } from '@material/web/field/filled-field'
import { MdOutlinedField as WebComponentMdOutlinedField } from '@material/web/field/outlined-field'
import { MdFocusRing as WebComponentMdFocusRing } from '@material/web/focus/md-focus-ring'
import { MdIcon as WebComponentMdIcon } from '@material/web/icon/icon'
import { MdFilledIconButton as WebComponentMdFilledIconButton } from '@material/web/iconbutton/filled-icon-button'
import { MdFilledTonalIconButton as WebComponentMdFilledTonalIconButton } from '@material/web/iconbutton/filled-tonal-icon-button'
import { MdIconButton as WebComponentMdIconButton } from '@material/web/iconbutton/icon-button'
import { MdOutlinedIconButton as WebComponentMdOutlinedIconButton } from '@material/web/iconbutton/outlined-icon-button'
import { MdList as WebComponentMdList } from '@material/web/list/list'
import { MdListItem as WebComponentMdListItem } from '@material/web/list/list-item'
import { MdMenu as WebComponentMdMenu } from '@material/web/menu/menu'
import { MdMenuItem as WebComponentMdMenuItem } from '@material/web/menu/menu-item'
import { MdSubMenu as WebComponentMdSubMenu } from '@material/web/menu/sub-menu'
import { MdCircularProgress as WebComponentMdCircularProgress } from '@material/web/progress/circular-progress'
import { MdLinearProgress as WebComponentMdLinearProgress } from '@material/web/progress/linear-progress'
import { MdRadio as WebComponentMdRadio } from '@material/web/radio/radio'
import { MdRipple as WebComponentMdRipple } from '@material/web/ripple/ripple'
import { MdFilledSelect as WebComponentMdFilledSelect } from '@material/web/select/filled-select'
import { Select as WebComponentMdSelect } from '@material/web/select/internal/select'
import { MdOutlinedSelect as WebComponentMdOutlinedSelect } from '@material/web/select/outlined-select'
import { MdSelectOption as WebComponentMdSelectOption } from '@material/web/select/select-option'
import { MdSlider as WebComponentMdSlider } from '@material/web/slider/slider'
import { MdSwitch as WebComponentMdSwitch } from '@material/web/switch/switch'
import { MdPrimaryTab as WebComponentMdPrimaryTab } from '@material/web/tabs/primary-tab'
import { MdSecondaryTab as WebComponentMdSecondaryTab } from '@material/web/tabs/secondary-tab'
import { MdTabs as WebComponentMdTabs } from '@material/web/tabs/tabs'
import { MdFilledTextField as WebComponentMdFilledTextField } from '@material/web/textfield/filled-text-field'
import { MdOutlinedTextField as WebComponentMdOutlinedTextField } from '@material/web/textfield/outlined-text-field'
import React from 'react'

const MdElevatedButton = createComponent({
    react: React,
    tagName: 'md-elevated-button',
    elementClass: WebComponentMdElevatedButton,
})

const MdFilledButton = createComponent({
    react: React,
    tagName: 'md-filled-button',
    elementClass: WebComponentMdFilledButton,
})

const MdFilledTonalButton = createComponent({
    react: React,
    tagName: 'md-filled-tonal-button',
    elementClass: WebComponentMdFilledTonalButton,
})

const MdOutlinedButton = createComponent({
    react: React,
    tagName: 'md-outlined-button',
    elementClass: WebComponentMdOutlinedButton,
})

const MdTextButton = createComponent({
    react: React,
    tagName: 'md-text-button',
    elementClass: WebComponentMdTextButton,
})

const MdCheckbox = createComponent({
    react: React,
    tagName: 'md-checkbox',
    elementClass: WebComponentMdCheckbox,
})

const MdAssistChip = createComponent({
    react: React,
    tagName: 'md-assist-chip',
    elementClass: WebComponentMdAssistChip,
})

const MdChipSet = createComponent({
    react: React,
    tagName: 'md-chip-set',
    elementClass: WebComponentMdChipSet,
})

const MdFilterChip = createComponent({
    react: React,
    tagName: 'md-filter-chip',
    elementClass: WebComponentMdFilterChip,
})

const MdInputChip = createComponent({
    react: React,
    tagName: 'md-input-chip',
    elementClass: WebComponentMdInputChip,
})

const MdSuggestionChip = createComponent({
    react: React,
    tagName: 'md-suggestion-chip',
    elementClass: WebComponentMdSuggestionChip,
})

const MdDialogBase = createComponent({
    react: React,
    tagName: 'md-dialog',
    elementClass: WebComponentMdDialog,
})

const MdDivider = createComponent({
    react: React,
    tagName: 'md-divider',
    elementClass: WebComponentMdDivider,
})

const MdElevation = createComponent({
    react: React,
    tagName: 'md-elevation',
    elementClass: WebComponentMdElevation,
})

const MdBrandedFab = createComponent({
    react: React,
    tagName: 'md-branded-fab',
    elementClass: WebComponentMdBrandedFab,
})

const MdFab = createComponent({
    react: React,
    tagName: 'md-fab',
    elementClass: WebComponentMdFab,
})

const MdFilledField = createComponent({
    react: React,
    tagName: 'md-filled-field',
    elementClass: WebComponentMdFilledField,
})

const MdOutlinedField = createComponent({
    react: React,
    tagName: 'md-outlined-field',
    elementClass: WebComponentMdOutlinedField,
})

const MdFocusRing = createComponent({
    react: React,
    tagName: 'md-focus-ring',
    elementClass: WebComponentMdFocusRing,
})

const MdIconBase = createComponent({
    react: React,
    tagName: 'md-icon',
    elementClass: WebComponentMdIcon,
})

const MdFilledIconButton = createComponent({
    react: React,
    tagName: 'md-filled-icon-button',
    elementClass: WebComponentMdFilledIconButton,
})

const MdFilledTonalIconButton = createComponent({
    react: React,
    tagName: 'md-filled-tonal-icon-button',
    elementClass: WebComponentMdFilledTonalIconButton,
})

const MdIconButton = createComponent({
    react: React,
    tagName: 'md-icon-button',
    elementClass: WebComponentMdIconButton,
})

const MdOutlinedIconButton = createComponent({
    react: React,
    tagName: 'md-outlined-icon-button',
    elementClass: WebComponentMdOutlinedIconButton,
})

const MdList = createComponent({
    react: React,
    tagName: 'md-list',
    elementClass: WebComponentMdList,
})

const MdListItem = createComponent({
    react: React,
    tagName: 'md-list-item',
    elementClass: WebComponentMdListItem,
})

const MdMenu = createComponent({
    react: React,
    tagName: 'md-menu',
    elementClass: WebComponentMdMenu,
})

const MdMenuItem = createComponent({
    react: React,
    tagName: 'md-menu-item',
    elementClass: WebComponentMdMenuItem,
})

const MdSubMenu = createComponent({
    react: React,
    tagName: 'md-sub-menu',
    elementClass: WebComponentMdSubMenu,
})

const MdCircularProgress = createComponent({
    react: React,
    tagName: 'md-circular-progress',
    elementClass: WebComponentMdCircularProgress,
})

const MdLinearProgress = createComponent({
    react: React,
    tagName: 'md-linear-progress',
    elementClass: WebComponentMdLinearProgress,
})

const MdRadio = createComponent({
    react: React,
    tagName: 'md-radio',
    elementClass: WebComponentMdRadio,
})

const MdRipple = createComponent({
    react: React,
    tagName: 'md-ripple',
    elementClass: WebComponentMdRipple,
})

const MdFilledSelectBase = createComponent({
    react: React,
    tagName: 'md-filled-select',
    elementClass: WebComponentMdFilledSelect,
})

const MdOutlinedSelectBase = createComponent({
    react: React,
    tagName: 'md-outlined-select',
    elementClass: WebComponentMdOutlinedSelect,
})

const MdSelectOptionBase = createComponent({
    react: React,
    tagName: 'md-select-option',
    elementClass: WebComponentMdSelectOption,
})

const MdSliderBase = createComponent({
    react: React,
    tagName: 'md-slider',
    elementClass: WebComponentMdSlider,
})

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
const MdSwitch = createComponent({
    react: React,
    tagName: 'md-switch',
    elementClass: WebComponentMdSwitch,
})

const MdPrimaryTab = createComponent({
    react: React,
    tagName: 'md-primary-tab',
    elementClass: WebComponentMdPrimaryTab,
})

const MdSecondaryTab = createComponent({
    react: React,
    tagName: 'md-secondary-tab',
    elementClass: WebComponentMdSecondaryTab,
})

const MdTabs = createComponent({
    react: React,
    tagName: 'md-tabs',
    elementClass: WebComponentMdTabs,
})

const MdFilledTextField = createComponent({
    react: React,
    tagName: 'md-filled-text-field',
    elementClass: WebComponentMdFilledTextField,
})

const MdOutlinedTextField = createComponent({
    react: React,
    tagName: 'md-outlined-text-field',
    elementClass: WebComponentMdOutlinedTextField,
})

export {
    // React Components
    MdElevatedButton,
    MdFilledButton,
    MdFilledTonalButton,
    MdOutlinedButton,
    MdTextButton,
    MdCheckbox,
    MdAssistChip,
    MdChipSet,
    MdFilterChip,
    MdInputChip,
    MdSuggestionChip,
    MdDialogBase,
    MdDivider,
    MdElevation,
    MdBrandedFab,
    MdFab,
    MdFilledField,
    MdOutlinedField,
    MdFocusRing,
    MdIconBase,
    MdFilledIconButton,
    MdFilledTonalIconButton,
    MdIconButton,
    MdOutlinedIconButton,
    MdList,
    MdListItem,
    MdMenu,
    MdMenuItem,
    MdSubMenu,
    MdCircularProgress,
    MdLinearProgress,
    MdRadio,
    MdRipple,
    MdFilledSelectBase,
    MdOutlinedSelectBase,
    MdSelectOptionBase,
    MdSliderBase,
    MdSwitch,
    MdPrimaryTab,
    MdSecondaryTab,
    MdTabs,
    MdFilledTextField,
    MdOutlinedTextField,
    // Web Components
    WebComponentMdElevatedButton,
    WebComponentMdFilledButton,
    WebComponentMdFilledTonalButton,
    WebComponentMdOutlinedButton,
    WebComponentMdTextButton,
    WebComponentMdCheckbox,
    WebComponentMdAssistChip,
    WebComponentMdChipSet,
    WebComponentMdFilterChip,
    WebComponentMdInputChip,
    WebComponentMdSuggestionChip,
    WebComponentMdDialog,
    WebComponentMdDivider,
    WebComponentMdElevation,
    WebComponentMdBrandedFab,
    WebComponentMdFab,
    WebComponentMdFilledField,
    WebComponentMdOutlinedField,
    WebComponentMdFocusRing,
    WebComponentMdIcon,
    WebComponentMdFilledIconButton,
    WebComponentMdFilledTonalIconButton,
    WebComponentMdIconButton,
    WebComponentMdOutlinedIconButton,
    WebComponentMdList,
    WebComponentMdListItem,
    WebComponentMdMenu,
    WebComponentMdMenuItem,
    WebComponentMdSubMenu,
    WebComponentMdCircularProgress,
    WebComponentMdLinearProgress,
    WebComponentMdRadio,
    WebComponentMdRipple,
    WebComponentMdSelect,
    WebComponentMdFilledSelect,
    WebComponentMdOutlinedSelect,
    WebComponentMdSelectOption,
    WebComponentMdSlider,
    WebComponentMdSwitch,
    WebComponentMdPrimaryTab,
    WebComponentMdSecondaryTab,
    WebComponentMdTabs,
    WebComponentMdFilledTextField,
    WebComponentMdOutlinedTextField,
}
