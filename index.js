var width   = 512;
var height  = 512;
var gl = require('gl')(width, height, { preserveDrawingBuffer: true });
const sharp = require('sharp');

var runDemo = require('./demo').runDemo;

runDemo(gl, width, height);

let bitmapData = new Uint8Array(width * height * 4)
gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, bitmapData);

sharp(Buffer.from(bitmapData), {raw: { width: width, height: height, channels: 4} })
            .flip()
            .jpeg()
            .toFile('output.jpeg', (err, info) => {

             });
