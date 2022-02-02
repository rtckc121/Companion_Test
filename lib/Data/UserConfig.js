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

const selfsigned = require('selfsigned')
const { sendResult } = require('../Resources/Util')
const CoreBase = require('../Core/Base')
const Registry = require('../Registry')

// The config for new installs
const default_config = {
	page_direction_flipped: false,
	page_plusminus: false,
	remove_topbar: false,

	emulator_control_enable: false,
	xkeys_enable: true,
	elgato_plugin_enable: false, // Also disables local streamdeck

	pin_enable: false,
	link_lockouts: false,
	pin: '',
	pin_timeout: 0,

	tcp_enabled: false,
	tcp_listen_port: 16759,

	udp_enabled: false,
	udp_listen_port: 16759,

	osc_enabled: false,
	osc_listen_port: 12321,

	rosstalk_enabled: false,

	emberplus_enabled: false,

	artnet_enabled: false,
	artnet_universe: 1,
	artnet_channel: 1,

	https_enabled: false,
	https_port: 8443,
	https_cert_type: 'self',
	https_self_cn: '',
	https_self_expiry: 365,
	https_self_cert: '',
	https_self_cert_created: '',
	https_self_cert_cn: '',
	https_self_cert_expiry: '',
	https_self_cert_private: '',
	https_self_cert_public: '',
	https_ext_private_key: '',
	https_ext_certificate: '',
	https_ext_chain: '',
}

class DataUserConfig extends CoreBase {
	constructor(registry) {
		super(registry, 'userconfig', 'lib/Data/UserConfig')

		this.data = {}

		// this.system.emit('config_get', 'bind_ip', (value) => {
		// 	default_config.https_self_cn = value
		// })

		this.system.on('http_rebind', (bind_ip) => {
			if (this.data !== undefined && default_config.https_self_cn == this.data.https_self_cn) {
				this.set_userconfig_key('https_self_cn', bind_ip)
			}
			default_config.https_self_cn = bind_ip
		})

		this.data = this.db.getKey('userconfig', {})

		this.checkV2InPlaceUpgrade()

		// copy default values. this will set newly added defaults too
		for (let k in default_config) {
			if (this.data[k] === undefined) {
				this.data[k] = default_config[k]
			}
		}

		// make sure the db has an updated copy
		this.db.setKey('userconfig', this.data)

		for (let key in this.data) {
			this.system.emit('set_userconfig_key', key, this.data[key])
		}

		this.system.on('get_userconfig', (cb) => {
			cb(this.data)
		})

		this.system.on('get_userconfig_key', (key, cb) => {
			cb(this.data[key])
		})

		this.system.emit('io_get', (io) => {
			this.system.on('io_connect', (socket) => {
				this.debug('socket ' + socket.id + ' connected')

				socket.on('set_userconfig_key', this.set_userconfig_key.bind(this))

				socket.on('reset_userconfig_key', (key) => {
					this.set_userconfig_key(key, default_config[key])
				})

				socket.on('get_userconfig_all', (answer) => {
					sendResult(socket, answer, 'get_userconfig_all', this.data)
				})

				socket.on('disconnect', () => {
					this.debug('socket ' + socket.id + ' disconnected')
				})

				socket.on('ssl_certificate_create', () => {
					try {
						const attrs = [{ name: 'commonName', value: this.data.https_self_cn }]
						const pems = selfsigned.generate(attrs, {
							days: this.data.https_self_expiry,
							algorithm: 'sha256',
							keySize: 2048,
						})
						if (pems.private && pems.public && pems.cert) {
							const cert = {
								https_self_cert_public: pems.public,
								https_self_cert_private: pems.private,
								https_self_cert: pems.cert,
								https_self_cert_cn: this.data.https_self_cn,
								https_self_cert_created: new Date().toLocaleString(),
								https_self_cert_expiry: `${this.data.https_self_expiry} days`,
							}

							this.set_userconfig_keys(cert)
						} else {
							this.log('error', `Couldn't generate certificate: not all pems returned`)
							this.debug(`Couldn't generate certificate: not all pems returned`)
						}
					} catch (e) {
						this.log('error', `Couldn't generate certificate: ${e.message}`)
						this.debug(`Couldn't generate certificate: ${e}`)
					}
				})

				socket.on('ssl_certificate_renew', () => {
					try {
						const attrs = [{ name: 'commonName', value: this.data.https_self_cert_cn }]
						const pems = selfsigned.generate(attrs, {
							days: this.data.https_self_expiry,
							algorithm: 'sha256',
							keySize: 2048,
							keyPair: {
								publicKey: this.data.https_self_cert_public,
								privateKey: this.data.https_self_cert_private,
							},
						})
						if (pems.private && pems.public && pems.cert) {
							const cert = {
								https_self_cert: pems.cert,
								https_self_cert_created: new Date().toLocaleString(),
								https_self_cert_expiry: `${this.data.https_self_expiry} days`,
							}

							this.set_userconfig_keys(cert)
						} else {
							this.log('error', `Couldn't renew certificate: not all pems returned`)
							this.debug(`Couldn't renew certificate: not all pems returned`)
						}
					} catch (e) {
						this.log('error', `Couldn't renew certificate: ${e.message}`)
						this.debug(`Couldn't renew certificate: ${e}`)
					}
				})

				socket.on('ssl_certificate_delete', () => {
					this.set_userconfig_keys({
						https_self_cert: '',
						https_self_cert_created: '',
						https_self_cert_cn: '',
						https_self_cert_expiry: '',
						https_self_cert_private: '',
						https_self_cert_public: '',
					})
				})
			})
		})
	}

	set_userconfig_key(key, value) {
		this.data[key] = value
		this.debug('set_userconfig_key', key, value)
		this.log('info', `set '${key}' to: ${value}`)
		this.io.emit('set_userconfig_key', key, value)
		setImmediate(() => {
			// give the change a chance to be pushed to the ui first
			this.system.emit('set_userconfig_key', key, value)
			this.db.setKey('userconfig', this.data)
		})
	}

	set_userconfig_keys(objects) {
		if (objects !== undefined) {
			for (let key in objects) {
				let value = objects[key]
				this.data[key] = value
				this.debug('set_userconfig_key', key, value)
				this.io.emit('set_userconfig_key', key, value)
				setImmediate(() => {
					// give the change a chance to be pushed to the ui first
					this.system.emit('set_userconfig_key', key, value)
				})
			}
			this.log('info', 'set multiple keys')
			setImmediate(() => {
				this.db.setKey('userconfig', this.data)
			})
		}
	}

	checkV2InPlaceUpgrade() {
		if (!this.db.getIsFirstRun()) {
			// This is an existing db, so setup the ports to match how it used to be
			const legacy_config = {
				tcp_enabled: true,
				tcp_listen_port: 51234,

				udp_enabled: true,
				udp_listen_port: 51235,

				osc_enabled: true,
				osc_listen_port: 12321,

				emberplus_enabled: true,

				xkeys_enable: false,
			}

			// check if these fields have already been defined
			let has_been_defined = false
			for (const k in legacy_config) {
				if (this.data[k] !== undefined) {
					has_been_defined = true
					break
				}
			}

			// copy across the legacy values
			if (!has_been_defined) {
				this.debug('Running one-time userconfig v2 upgrade')
				for (let k in legacy_config) {
					if (this.data[k] === undefined) {
						this.data[k] = legacy_config[k]
					}
				}
			}
		}
	}
}

module.exports = DataUserConfig