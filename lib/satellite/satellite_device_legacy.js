/*
 * This file is part of the Companion project
 * Copyright (c) 2019 Bitfocus AS
 * Authors: Håkon Nessjøen <haakon@bitfocus.io>, William Viker <william@bitfocus.io>
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

/**
 * This legacy Satellite API is deprecated. Please use the new Satellite API instead.
 * The new API can do more, in a simpler and more flexible protocol
 */

var EventEmitter = require('events').EventEmitter
var util = require('util')
var debug = require('debug')('lib/satellite_device')
var protocol = require('./satellite_protocol_legacy')

function satellite(system, devicepath, deviceInfo) {
	var self = this

	self.system = system
	EventEmitter.call(self)

	self.type = 'Satellite device'
	self.serialnumber = devicepath
	self.id = devicepath
	self.keysPerRow = deviceInfo.keysPerRow ? deviceInfo.keysPerRow : 8
	self.keysTotal = deviceInfo.keysTotal ? deviceInfo.keysTotal : 32

	debug('Adding Satellite device')

	self.devicepath = devicepath
	self.config = ['orientation', 'brightness']

	self._config = {
		rotation: 0,
		brightness: 100,
	}

	debug('Waiting for satellite startup: ', devicepath + '_satellite_startup')
	system.once(devicepath + '_satellite_startup', function (socket, deviceId) {
		self.socket = socket
		self.deviceId = deviceId

		system.emit('elgato_ready', devicepath)
	})

	system.on(devicepath + '_button', function (key, state) {
		self.doButton(key, state)
	})

	self.clearImage = Buffer.alloc(72 * 72 * 3)
}

util.inherits(satellite, EventEmitter)

satellite.prototype.begin = function () {
	var self = this

	self.setBrightness(self._config.brightness)
}

satellite.prototype.quit = function () {
	var self = this
	self.system.removeAllListeners(self.devicepath + '_button')
}

satellite.prototype.draw = function (key, buffer, style) {
	var self = this

	if (buffer === undefined || buffer.length != 15552) {
		debug('buffer was not 15552, but ', buffer.length)
		return false
	}

	buffer = self.handleBuffer(buffer)

	self.fillImage(key, buffer)

	return true
}

satellite.prototype.doButton = function (key, state) {
	var self = this

	const keyIndex2 = this.toGlobalKey(key)

	if (keyIndex2 >= 0 && keyIndex2 < global.MAX_BUTTONS) {
		self.system.emit('elgato_click', self.devicepath, keyIndex2, state)
	}
}

satellite.prototype.clearDeck = function () {
	var self = this
	debug('elgato.prototype.clearDeck()')
	if (self.socket !== undefined) {
		for (var i = 0; i < self.keysTotal; ++i) {
			var buf = protocol.SCMD_DRAW7272_PARSER.serialize({
				deviceId: self.deviceId,
				keyIndex: i,
				image: self.clearImage,
			})
			protocol.sendPacket(self.socket, protocol.SCMD_DRAW7272, buf)
		}
	} else {
		debug('trying to emit to nonexistaant socket: ', self.id)
	}
}

/* elgato-streamdeck functions */

satellite.prototype.setConfig = function (config, cb) {
	var self = this

	let redraw = false

	if (self._config.rotation != config.rotation && config.rotation !== undefined) {
		redraw = true
	}

	if (self._config.brightness != config.brightness && config.brightness !== undefined) {
		self.setBrightness(config.brightness)
	}

	self._config = config

	cb(redraw)
}

satellite.prototype.fillImage = function (keyIndex, imageBuffer) {
	var self = this

	const keyIndex2 = self.toDeviceKey(keyIndex)
	if (keyIndex2 === -1) return

	if (imageBuffer.length !== 15552) {
		throw new RangeError('Expected image buffer of length 15552, got length ' + imageBuffer.length)
	}

	if (self.socket !== undefined) {
		var buf = protocol.SCMD_DRAW7272_PARSER.serialize({
			deviceId: self.deviceId,
			keyIndex: keyIndex2,
			image: imageBuffer,
		})

		protocol.sendPacket(self.socket, protocol.SCMD_DRAW7272, buf)
	}
}

satellite.prototype.setBrightness = function (value) {
	var self = this

	debug('brightness: ' + value)
	if (self.socket !== undefined) {
		var buf = protocol.SCMD_BRIGHTNESS_PARSER.serialize({
			deviceId: self.deviceId,
			percent: value,
		})

		protocol.sendPacket(self.socket, protocol.SCMD_BRIGHTNESS, buf)
	}
}

// Steal rotation code from usb/common
var common = require('../usb/common')
util.inherits(satellite, common)

module.exports = satellite
