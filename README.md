# Audio [![Travis][travis-icon]][travis] [![Gitter][gitter-icon]][gitter]
> Audio in JavaScript.

An object that enables you to store, read, and write [PCM audio][pcm] data more easily.  You can use [algorithmic functions][npm-audiojs] for any type of audio manipulation, such as compression or conversion to and from different audio formats.  This object works as the building block for audio in JavaScript, and [Audio.js][audiojs] is a suite of common audio utilities based on top of it.

```javascript
var test = new Audio({
  sample: [34, 334, -23, 0, ...pulses], // Pulse data or buffer
  sampleRate: 44100, // Sample rate
  bitDepth: 16, // Bit depth
  length: 44100 * 10, // 10s length
  byteOrder: 'LE', // Either BE or LE
  // ...
});
```
See more options and usage in [the documentation](/docs).

## Usage
```shell
$ npm install --save audio
```
For use in the browser use [Browserify][browserify].

See [the "docs" folder](/docs) for more information on using `Audio`.

## Also See
 - [Audio.js][audiojs]: A suite of utilities based around this object.
 - [node-speaker][node-speaker]: Write PCM data to the speakers in Node.js.

## Credits
| ![jamen][avatar] |
|:---:|
| [Jamen Marzonie][github] |

## License
[MIT](LICENSE) &copy; Jamen Marzonie

[avatar]: https://avatars.githubusercontent.com/u/6251703?v=3&s=125
[github]: https://github.com/jamen
[travis]: https://travis-ci.org/audiojs/audio
[travis-icon]: https://img.shields.io/travis/audiojs/audio.svg
[gitter]: https://gitter.im/audiojs/audio
[gitter-icon]: https://img.shields.io/gitter/room/audiojs/audio.svg
[browserify]: http://npmjs.com/browserify
[npm-audiojs]: https://www.npmjs.com/browse/keyword/audiojs
[audiojs]: https://github.com/audiojs
[pcm]: https://en.wikipedia.org/wiki/Pulse-code_modulation
[node-speaker]: https://github.com/tootallnate/node-speaker
