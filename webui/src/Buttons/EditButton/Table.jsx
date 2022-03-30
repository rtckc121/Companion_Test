import { CFormGroup, CInputGroupText, CLabel } from '@coreui/react'
import React, { useCallback, useContext, useMemo } from 'react'
import {
	CheckboxInputField,
	ColorInputField,
	DropdownInputField,
	NumberInputField,
	TextInputField,
	TextWithVariablesInputField,
} from '../../Components'
import { InstancesContext } from '../../util'

export function ActionTableRowOption({ instanceId, actionId, option, value, setValue, visibility }) {
	const setValue2 = useCallback((val) => setValue(actionId, option.id, val), [actionId, option.id, setValue])

	if (!option) {
		return <p>Bad option</p>
	}

	let control = ''
	switch (option.type) {
		case 'textinput': {
			control = <TextInputField value={value} definition={option} setValue={setValue2} />
			break
		}
		case 'textwithvariables': {
			control = <TextWithVariablesInputField value={value} definition={option} setValue={setValue2} />
			break
		}
		case 'dropdown': {
			control = <DropdownInputField value={value} definition={option} multiple={option.multiple} setValue={setValue2} />
			break
		}
		case 'multiselect': {
			/** Deprecated: Use dropdown with `multiple: true` instead */
			control = <DropdownInputField value={value} definition={option} multiple={true} setValue={setValue2} />
			break
		}
		case 'checkbox': {
			control = <CheckboxInputField value={value} definition={option} setValue={setValue2} />
			break
		}
		case 'colorpicker': {
			control = <ColorInputField value={value} definition={option} setValue={setValue2} />
			break
		}
		case 'number': {
			control = <NumberInputField value={value} definition={option} setValue={setValue2} />
			break
		}
		case 'text': {
			// Just the label is wanted
			control = ''
			break
		}
		default:
			// The 'internal instance' is allowed to use some special input fields, to minimise when it reacts to changes elsewhere in the system
			if (instanceId === 'internal') {
				switch (option.type) {
					case 'internal:instance_id':
						control = <InternalInstanceIdDropdown value={value} setValue={setValue2} />
						break
					default:
						// Use default below
						break
				}
			}
			// Use default below
			break
	}

	if (control === undefined) {
		control = <CInputGroupText>Unknown type "{option.type}"</CInputGroupText>
	}

	return (
		<CFormGroup style={{ display: visibility === false ? 'none' : null }}>
			<CLabel>{option.label}</CLabel>
			{control}
		</CFormGroup>
	)
}

function InternalInstanceIdDropdown({ value, setValue }) {
	const context = useContext(InstancesContext)

	const choices = useMemo(() => {
		const instance_choices = [{ id: 'all', label: 'All Instances' }]
		for (const [id, config] of Object.entries(context)) {
			instance_choices.push({ id, label: config.label ?? id })
		}
		return instance_choices
	}, [context])

	return (
		<DropdownInputField
			value={value}
			definition={{
				choices: choices,
				default: 'all',
			}}
			multiple={false}
			setValue={setValue}
		/>
	)
}
