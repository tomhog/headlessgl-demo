var runDemo = require('./demo').runDemo;

var w = 512;
var h = 512;
var canvas = document.querySelector("#webglcanvas");
var gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});

runDemo(gl, w, h);

let bitmapData = new Uint8Array(w * h * 4)
gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, bitmapData);

let capturecanvas = document.createElement('canvas');
let capturecontext = capturecanvas.getContext('2d');

capturecanvas.width = w;
capturecanvas.height = h;

let imageData = capturecontext.createImageData(w, h);
imageData.data.set(bitmapData);

capturecontext.putImageData(imageData, 0, 0);

var link = document.createElement('a');
link.download = "capture" + '.png';
link.href = capturecanvas.toDataURL("image/png", 1);
link.click();