var test = require('tape');
var Audio = require('..');

test('initializing audio', function(t) {
  // Static defaults
  var foo = new Audio();
  t.is(foo.sampleRate, 44100, 'default sample rate');
  t.is(foo.bitDepth, 16, 'default bit depth');
  t.is(foo.channels, 2, 'default channels amount');
  t.is(foo.byteOrder, 'LE', 'default byte order');

  // Dynamic signed defaults + custom
  var bar = new Audio({bitDepth: 16});
  var baz = new Audio({bitDepth: 8});
  var xuq = new Audio({bitDepth: 8, signed: false});
  t.is(bar.signed, true, 'signed with bit-depth more than 8');
  t.is(baz.signed, false, 'unsigned with bit-depth of 8');
  t.is(xuq.signed, false, 'unsigned with bit-depth of 8 from custom option');

  // Dynamic length defaults + custom
  var faz = new Audio({source: new Buffer(400).fill(0)});
  var fox = new Audio({bitDepth: 8, length: 1000});
  var fax = new Audio({length: 10000});
  t.is(faz.length, 100, 'length of 400 bytes of 16-bit 2 channel audio');
  t.is(fox.length, 1000, 'length of custom input');
  t.is(fox.source.length, 88200, 'length of source for 1s 8-bit depth');
  t.is(fax.source.length, 1764000, 'length of source for 10s 16-bit depth');

  // Shorthand length initalizing
  var qax = new Audio(1000);
  t.is(qax.length, 44100, 'length shorthand initializing');
  t.is(qax.source.length, 176400, 'length shorthand initializing source');

  t.end();
});