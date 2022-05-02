/*
 * This file is part of the Companion project
 * Copyright (c) 2018 Bitfocus AS
 * Authors: William Viker <william@bitfocus.io>, Håkon Nessjøen <haakon@bitfocus.io>
 *
 * This program is free software.
 * You should have received a copy of the MIT licence as well as the Bitfocus
 * Individual Contributor License Agreement for companion along with
 * this program.
 *
 * You can be released from the requirements of the license by purchasing
 * a commercial license. Buying such a license is mandatory as soon as you
 * develop commercial activities involving the Companion software without
 * disclosing the source code of your own applications.
 *
 */

import { cloneDeep } from 'lodash-es'
import CoreBase from '../Core/Base.js'
import { rgb } from '../Resources/Util.js'

function fetchPageAndBank(options, info) {
	let thePage = options.page
	let theBank = options.bank

	if (info) {
		if (thePage === 0 || thePage === '0') thePage = info.page
		if (theBank === 0 || theBank === '0') theBank = info.bank
	}

	return {
		thePage,
		theBank,
	}
}

export default class Bank extends CoreBase {
	constructor(registry, internalModule) {
		super(registry, 'internal', 'lib/Internal/Bank')

		// this.internalModule = internalModule

		setImmediate(() => {
			this.system.on('graphics_bank_invalidated', (page, bank) => {
				// TODO - can we make this more specific? This could invalidate a lot of stuff unnecessarily..
				this.internalModule.checkFeedbacks('bank_style', 'bank_pushed')
			})
		})
	}

	getActionDefinitions() {
		return {
			button_pressrelease: {
				label: 'Button press and release',
				options: [
					{
						type: 'internal:page',
						label: 'Page',
						tooltip: 'What page is the button on?',
						id: 'page',
					},
					{
						type: 'internal:bank',
						label: 'Bank',
						tooltip: 'Which button?',
						id: 'bank',
					},
				],
			},
			button_press: {
				label: 'Button Press',
				options: [
					{
						type: 'internal:page',
						label: 'Page',
						tooltip: 'What page is the button on?',
						id: 'page',
					},
					{
						type: 'internal:bank',
						label: 'Bank',
						tooltip: 'Which Button?',
						id: 'bank',
					},
				],
			},
			button_release: {
				label: 'Button Release',
				options: [
					{
						type: 'internal:page',
						label: 'Page',
						tooltip: 'What page is the button on?',
						id: 'page',
					},
					{
						type: 'internal:bank',
						label: 'Bank',
						tooltip: 'Which Button?',
						id: 'bank',
					},
				],
			},

			button_text: {
				label: 'Button Text',
				options: [
					{
						type: 'textinput',
						label: 'Button Text',
						id: 'label',
						default: '',
					},
					{
						type: 'internal:page',
						label: 'Page',
						tooltip: 'What page is the button on?',
						id: 'page',
					},
					{
						type: 'internal:bank',
						label: 'Bank',
						tooltip: 'Which Button?',
						id: 'bank',
					},
				],
			},
			textcolor: {
				label: 'Button Text Color',
				options: [
					{
						type: 'colorpicker',
						label: 'Text Color',
						id: 'color',
						default: '0',
					},
					{
						type: 'internal:page',
						label: 'Page',
						tooltip: 'What page is the button on?',
						id: 'page',
					},
					{
						type: 'internal:bank',
						label: 'Bank',
						tooltip: 'Which Button?',
						id: 'bank',
					},
				],
			},
			bgcolor: {
				label: 'Button Background Color',
				options: [
					{
						type: 'colorpicker',
						label: 'Background Color',
						id: 'color',
						default: '0',
					},
					{
						type: 'internal:page',
						label: 'Page',
						tooltip: 'What page is the button on?',
						id: 'page',
					},
					{
						type: 'internal:bank',
						label: 'Bank',
						tooltip: 'Which Button?',
						id: 'bank',
					},
				],
			},

			panic_bank: {
				label: 'Abort actions on button',
				options: [
					{
						type: 'internal:page',
						label: 'Page',
						tooltip: 'What page is the button on?',
						id: 'page',
					},
					{
						type: 'internal:bank',
						label: 'Bank',
						tooltip: 'Which Button?',
						id: 'bank',
					},
					{
						type: 'checkbox',
						label: 'Unlatch?',
						id: 'unlatch',
						default: false,
					},
				],
			},
			panic: {
				label: 'Abort all delayed actions',
				options: [],
			},
		}
	}

	getFeedbackDefinitions() {
		return {
			bank_style: {
				type: 'advanced',
				label: 'Use another buttons style',
				description: 'Imitate the style of another button',
				options: [
					{
						type: 'internal:page',
						label: 'Page',
						tooltip: 'What page is the button on?',
						id: 'page',
					},
					{
						type: 'internal:bank',
						label: 'Bank',
						tooltip: 'Which Button?',
						id: 'bank',
					},
				],
			},
			bank_pushed: {
				type: 'boolean',
				label: 'When button is pushed/latched',
				description: 'Change style when a button is being pressed or is latched',
				style: {
					color: rgb(255, 255, 255),
					bgcolor: rgb(255, 0, 0),
				},
				options: [
					{
						type: 'internal:page',
						label: 'Page',
						tooltip: 'What page is the button on?',
						id: 'page',
					},
					{
						type: 'internal:bank',
						label: 'Bank',
						tooltip: 'Which Button?',
						id: 'bank',
					},
				],
			},
		}
	}

	executeFeedback(feedback) {
		if (feedback.type === 'bank_style') {
			const { thePage, theBank } = fetchPageAndBank(feedback.options, feedback.info)

			const render = this.graphics.getBank(thePage, theBank)
			if (render?.style) {
				// Return cloned resolved style
				return cloneDeep(render.style)
			} else {
				return {}
			}
		} else if (feedback.type === 'bank_pushed') {
			const { thePage, theBank } = fetchPageAndBank(feedback.options, feedback.info)

			const render = this.graphics.getBank(thePage, theBank)
			if (render?.style) {
				// Return cloned resolved style
				return !!render.style.pushed
			} else {
				return false
			}
		}
	}

	executeAction(action, extras) {
		if (action.action === 'button_pressrelease') {
			const { thePage, theBank } = fetchPageAndBank(action.options, extras)

			this.bank.action.pressBank(thePage, theBank, true)
			this.bank.action.pressBank(thePage, theBank, false)
			return true
		} else if (action.action === 'button_press') {
			const { thePage, theBank } = fetchPageAndBank(action.options, extras)

			this.bank.action.pressBank(thePage, theBank, true)
			return true
		} else if (action.action === 'button_release') {
			const { thePage, theBank } = fetchPageAndBank(action.options, extras)

			this.bank.action.pressBank(thePage, theBank, false)
			return true
		} else if (action.action === 'bgcolor') {
			const { thePage, theBank } = fetchPageAndBank(action.options, extras)

			this.bank.changeField(thePage, theBank, 'bgcolor', action.options.color)
			return true
		} else if (action.action === 'textcolor') {
			const { thePage, theBank } = fetchPageAndBank(action.options, extras)

			this.bank.changeField(thePage, theBank, 'color', action.options.color)
			return true
		} else if (action.action === 'button_text') {
			const { thePage, theBank } = fetchPageAndBank(action.options, extras)

			this.bank.changeField(thePage, theBank, 'text', action.options.label)
			return true
		} else if (action.action === 'panic_bank') {
			const { thePage, theBank } = fetchPageAndBank(action.options, extras)

			this.bank.action.abortBank(thePage, theBank, action.options.unlatch)
			return true
		} else if (action.action === 'panic') {
			this.bank.action.abortAll()
			return true
		}
	}
}