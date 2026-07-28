import {
    MdFilledSelectBase,
    MdOutlinedSelectBase,
    MdSelectOptionBase,
    type WebComponentMdFilledSelect,
    type WebComponentMdOutlinedSelect,
    type WebComponentMdSelect,
} from '@shared/ts/lib/material.ts'
import { type FormEventHandler, type Ref, useCallback, useMemo } from 'react'

type SimpleOption<Value extends string> = string | { label: string; value: Value }

type GroupedOption<Value extends string> = {
    group: string
    options: SimpleOption<Value>[]
}

type OptionType<Value extends string> =
    | string[]
    | readonly string[]
    | { label: string; value: Value }[]
    | GroupedOption<Value>[]

interface SelectProps<Value extends string, Options extends OptionType<Value>> {
    options: Options
    value?: Value
    disabled?: boolean
    id?: string
    name?: string
    label?: string
    onChange?: (value: Value) => void
    className?: string
    variant?: 'outlined' | 'filled'
    ref?: Ref<WebComponentMdSelect>
}

/**
 * Material Web Select component.
 *
 * @prop {Options}         options - The options to display in the select
 * @prop {Options[number]} value - The value of the select
 * @prop {boolean}         disabled - Whether the select is disabled
 * @prop {string}          id - The id of the select
 * @prop {string}          name - The name of the select
 * @prop {string}          label - The label of the select
 * @prop {string}          className - The class name of the select
 * @prop {string}          variant - The variant of the select
 * @prop {Ref<WebComponentMdSelect>} ref - The ref of the select
 *
 * @see https://github.com/material-components/material-web/blob/70a1d8e59a127df886819197f24d76bf96524196/docs/components/select.md
 */
export const MdSelect = <Value extends string, Options extends OptionType<Value>>({
    options,
    value,
    id,
    name,
    label,
    disabled = false,
    onChange,
    className,
    ref,
    variant = 'outlined',
}: SelectProps<Value, Options>) => {
    const optionElements = useMemo(() => {
        const elements: React.ReactNode[] = []

        const renderOption = (option: SimpleOption<string>, key: string) => {
            const { label, value } =
                typeof option === 'string' ? { label: option, value: option } : option
            return (
                <MdSelectOptionBase key={key} value={String(value)}>
                    <div slot='headline'>{label}</div>
                </MdSelectOptionBase>
            )
        }

        for (const option of options) {
            // Check if this is a grouped option
            if (typeof option === 'object' && 'group' in option && 'options' in option) {
                const grouped = option as GroupedOption<string>
                // Add group header as a disabled option
                elements.push(
                    <MdSelectOptionBase
                        key={`group-${grouped.group}`}
                        value=''
                        disabled
                        style={{ opacity: 0.6, fontSize: '0.85em', fontWeight: 500 }}>
                        <div slot='headline'>{grouped.group}</div>
                    </MdSelectOptionBase>,
                )
                // Add group options
                for (const groupOption of grouped.options) {
                    const { label, value } =
                        typeof groupOption === 'string'
                            ? { label: groupOption, value: groupOption }
                            : groupOption
                    elements.push(renderOption({ label, value }, `${grouped.group}-${value}`))
                }
            } else {
                // Simple option (string or {label, value})
                const { label, value } =
                    typeof option === 'string' ? { label: option, value: option } : option
                elements.push(renderOption({ label, value }, String(value)))
            }
        }

        return elements
    }, [options])

    const handleChange: FormEventHandler = useCallback(
        (e) => onChange?.((e.target as HTMLSelectElement).value as Value),
        [onChange],
    )

    return variant === 'outlined' ? (
        <MdOutlinedSelectBase
            id={id}
            name={name}
            value={String(value)}
            disabled={disabled}
            onChange={handleChange}
            className={className}
            ref={ref as Ref<WebComponentMdOutlinedSelect>}
            label={label}>
            {optionElements}
        </MdOutlinedSelectBase>
    ) : (
        <MdFilledSelectBase
            id={id}
            name={name}
            value={String(value)}
            disabled={disabled}
            onChange={handleChange}
            className={className}
            ref={ref as Ref<WebComponentMdFilledSelect>}
            label={label}>
            {optionElements}
        </MdFilledSelectBase>
    )
}

MdSelect.displayName = 'MdSelect'
