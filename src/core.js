/**
 * Core Audio methods
 */

'use strict'


const loadAudio = require('audio-loader')
const decodeAudio = require('audio-decode')
const extend = require('object-assign')
const nidx = require('negative-index')
const isPromise = require('is-promise')
const saveAs = require('save-file')
const isBrowser = require('is-browser')
const toWav = require('audiobuffer-to-wav')
const callsites = require('callsites')
const path = require('path')
const AudioBuffer = require('audio-buffer')
const AudioBufferList = require('audio-buffer-list')
const remix = require('audio-buffer-remix')
const isAudioBuffer = require('is-audio-buffer')
const isPlainObj = require('is-plain-obj')
const isRelative = require('is-relative')
const getContext = require('audio-context')
const isURL = require('is-url')
const convert = require('pcm-convert')
const aformat = require('audio-format')
const createBuffer = require('audio-buffer-from')
const assert = require('assert')


let Audio = require('../')


// cache of loaded audio buffers for urls
Audio.cache = {}


// cache URLs
Audio.prototype.cache = true


// enable metrics
Audio.prototype.stats = false

// default params
Object.defineProperties(Audio.prototype, {
	channels: {
		set: function (channels) {
			this.buffer = remix(this.buffer, this.buffer.numberOfChannels, channels)
		},
		get: function () {
			return this.buffer.numberOfChannels
		}
	},
	sampleRate: {
		set: function () {
			// TODO
			throw Error('Unimplemented.')
		},
		get: function () {
			return this.buffer.sampleRate || 44100
		}
	},
	duration: {
		set: function (duration) {
			let length = Math.floor(duration * this.sampleRate)
			if (length < this.length) {
				this.buffer = this.buffer.slice(0, length)
			}
			else if (length > this.length) {
				this.buffer = this.pad(duration, {right: true})
			}
		},
		get: function () {
			return this.buffer.duration
		}
	},
	length: {
		set: function (length) {
			if (length < this.length) {
				this.buffer = this.buffer.slice(0, length)
			}
			else if (length > this.length) {
				// TODO
				// this.buffer = this.pad({start: , right: true})
			}
		},
		get: function () {
			return this.buffer.length
		}
	}
})


// create audio from multiple sources
Audio.join =
Audio.concat =
Audio.create =
Audio.from = function from (...sources) {
	let items = [], channels = 1

	let options = sources[sources.length - 1]

	if ((isPlainObj(options) && (!options.duration || !options.length)) || typeof options === 'string' ) {
		sources.pop()
	}
	else {
		options = null
	}

	for (let i = 0; i < sources.length; i++) {
		let source = sources[i], subsource
		console.log(source)

		//multiple source
		if (Array.isArray(source) &&
				!(typeof source[0] === 'number' && (source.length === 1 || typeof source[1] === 'number')) &&
				!(source.length < 32 && source.every(ch => Array.isArray(ch) || ArrayBuffer.isView(ch)))
			) {
			subsource = Audio.from(...source, options).buffer
		}
		else {
			subsource = source instanceof Audio ? source.buffer : Audio(source, options).buffer
		}

		items.push(subsource)
		channels = Math.max(subsource.numberOfChannels, channels)
	}

	let buffer = new AudioBufferList(items, {numberOfChannels: channels, sampleRate: items[0].sampleRate})

	return new Audio(buffer)
}


// load audio from remote/local url
Audio.load = function load (source, callback) {
	let promise

	if (typeof source === 'string') {
		source = resolvePath(source, 2)

		// load cached version, if any
		if (Audio.cache[source]) {
			// if source is cached but loading - just clone when loaded
			if (isPromise(Audio.cache[source])) {
				promise = Audio.cache[source].then(audio => {
					audio = Audio(audio)
					callback && callback(null, audio)
					return Promise.resolve(audio)
				}, error => {
					callback && callback(error)
					return Promise.reject(error)
				})
			}
			// else clone right ahead
			else {
				promise = Promise.resolve(Audio(Audio.cache[source]))
			}
		}

		// load source by path
		else {
			promise = loadAudio(source).then(audioBuffer => {
				let audio = Audio(audioBuffer)
				Audio.cache[source] = audio
				callback && callback(null, audio)
				return Promise.resolve(audio)
			}, error => {
				callback && callback(error)
				return Promise.reject(error)
			})

			// save promise to cache
			Audio.cache[source] = promise
		}
	}

	// multiple sources
	else if (Array.isArray(source)) {
		let items = []

		// make sure for every array item audio instance is created and loaded
		for (let i = 0; i < source.length; i++) {
			let a = source[i]
			if (typeof a === 'string') {
				a = resolvePath(a, 2)
				items[i] = Audio.load(a)
			}
			else if (isPromise(a)) {
				items[i] = a
			}
			else {
				items[i] = Promise.resolve(Audio(a))
			}
		}

		// then do promise once all loaded
		promise = Promise.all(items).then((list) => {
			callback && callback(null, list)
			return Promise.resolve(list)
		}, error => {
			callback && callback(error)
			return Promise.reject(error)
		})
	}

	// fall back non-string sources to decode
	else {
		promise = Audio.decode(source, callback)
	}

	return promise
}


// decode audio buffer
Audio.decode = function decode (source, options, callback) {
	if (typeof options === 'function') {
		callback = options
		options = {context: this.context}
	}

	if (!source) throw Error('No source to decode');

	// decode multiple items
	if (Array.isArray(source)) {
		let items = []

		// make sure for every array item audio instance is created and loaded
		for (let i = 0; i < source.length; i++) {
			let a = source[i]
			if (isPromise(a)) {
				items[i] = a
			}
			else {
				items[i] = Audio.decode(a)
			}
		}

		// then do promise once all loaded
		return Promise.all(items).then((list) => {
			callback && callback(null, list)
			return Promise.resolve(list)
		}, error => {
			callback && callback(error)
			return Promise.reject(error)
		})
	}

	// convert to AudioBuffer
	return decodeAudio(source, options).then(
		audioBuffer => {
			let audio = Audio(audioBuffer)
			callback && callback(null, audio)
			return audio
		},
		error => {
			callback && callback(error)
			return Promise.reject(error)
		}
	)
}


// record streamish source
Audio.record = function record (source, options, callback) {

}


// download file or create a file in node
Audio.prototype.save = function save (fileName, ondone) {
	if (!fileName) throw Error('File name is not provided')

	let wav = toWav(this.buffer.slice())

	// fix path for node
	fileName = resolvePath(fileName)

	saveAs(wav, fileName, (err) => {
		ondone && ondone(err, this)
	})

	return this
}


// create a duplicate or clone of audio
Audio.prototype.clone = function clone (deep) {
	if (deep == null || deep) return new Audio(this.buffer.clone())
	else return new Audio(this.buffer)
}


// test if audio is equal
Audio.equal =
Audio.isEqual = function (a, ...sources) {
	for (let i = 0; i < sources.length; i++) {
		let b = sources[i]

		if (a === b) return true
		if (a.length !== b.length || a.channels !== b.channels || a.sampleRate != b.sampleRate) return false


		for (let c = 0; c < a.channels; c++) {
			let dataA = a.getChannelData(c);
			let dataB = b.getChannelData(c);

			for (let i = 0; i < dataA.length; i++) {
				if (dataA[i] !== dataB[i]) return false;
			}
		}
	}

	return true
}


// calc start, end, length and channels params from options
Audio.prototype._args = function (time, duration, options, cb) {
	// no args at all
	if (time == null && duration == null && options == null) {
		options = {}
		time = 0
		duration = this.duration
	}
	// single arg
	else if (time != null && duration == null && options == null) {
		// {}
		if (typeof time !== 'number') {
			options = time
			time = 0
			duration = this.duration
		}
		// number
		else {
			options = {}
			duration = this.duration
		}
	}
	// two args
	else if (time != null && duration != null && options == null) {
		// 1, 1
		if (typeof duration === 'number') {
			options = {}
		}
		// 1, {}
		else if (typeof duration != 'number') {
			options = duration
			duration = this.duration
		}
	}

	options = extend({}, options)
	if (time == null) time = 0
	if (duration == null) duration = this.duration

	if (!time && duration < 0) time = -0;

	// ensure channels
	if (options.channel != null) {
		options.channels = options.channel
	}
	if (typeof options.channels === 'number') {
		options.channels = [options.channels]
	}
	if (options.channels == null) {
		let channels = options.channels || this.channels
		options.channels = []
		for (let i = 0; i < channels; i++) {
			options.channels.push(i)
		}
	}
	assert(Array.isArray(options.channels), 'Bad `channels` argument')

	// take over from/to params
	// FIXME: reconsider these params
	if (options.from != null) time = options.from
	if (options.to != null) duration = options.to - time
	if (options.length != null) duration = options.length * this.sampleRate
	if (options.duration != null) duration = options.duration

	// detect raw interval
	if (options.start == null) {
		let startOffset = Math.floor(time * this.sampleRate)
		startOffset = nidx(startOffset, this.buffer.length)
		options.start = startOffset
	}
	if (options.end == null) {
		let len = duration * this.sampleRate
		let endOffset;
		if (len < 0) {
			endOffset = nidx(options.start + len, this.buffer.length)
		}
		else {
			endOffset = Math.min(options.start + len, this.buffer.length)
		}
		options.end = endOffset
	}

	// provide full options
	if (options.length == null) options.length = options.end - options.start
	if (options.from == null) options.from = options.start / this.sampleRate
	if (options.to == null) options.to = options.end / this.sampleRate
	if (options.duration == null) options.duration = options.length / this.sampleRate

	if (options.dtype) options.format = options.dtype

	return options
}

// path resolver taking in account file structure
function resolvePath (fileName, depth=2) {
	if (!isBrowser && isRelative(fileName) && !isURL(fileName)) {
		var callerPath = callsites()[depth].getFileName()
		fileName = path.dirname(callerPath) + path.sep + fileName
		fileName = path.normalize(fileName)
	}

	return fileName
}