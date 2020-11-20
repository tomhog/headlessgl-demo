const glMatrix = require("gl-matrix");

let runDemo = function(gl, w, h)
{
    let checkError = function(header)
    {
        let error = gl.getError();
        if(error != gl.NO_ERROR)
        {
            let errorstring = "";
            switch(error)
            {
                case gl.INVALID_ENUM: errorstring = "INVALID_ENUM"; break;
                case gl.INVALID_VALUE: errorstring = "INVALID_VALUE"; break;
                case gl.INVALID_OPERATION: errorstring = "INVALID_OPERATION"; break;
                case gl.INVALID_FRAMEBUFFER_OPERATION: errorstring = "INVALID_FRAMEBUFFER_OPERATION"; break;
                case gl.OUT_OF_MEMORY: errorstring = "OUT_OF_MEMORY"; break;
                case gl.INVALID_ENUM: CONTEXT_LOST_WEBGL = "CONTEXT_LOST_WEBGL"; break;
            }
            console.log(header + ": gl error:" + (errorstring != "" ? errorstring : error));
        }
    }
    //
    // create fbo to render into
    //

    let fbo = {};
    fbo.id = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo.id);

    // create color texture as target for fbo
    let colortex = {};
    colortex.id = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, colortex.id);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    // create depth texture as target for fbo
    /*let depthtex = {};
    depthtex.id = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthtex.id);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, w, h, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
    */
    let depthbuf = {};
    depthbuf.id = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthbuf.id);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h);
    
    // bind color and depth to fbo
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colortex.id, 0);
    //gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthtex.id, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthbuf.id);

    checkError("after fbo create");
    //
    // create our mesh to render
    //

    let verts = [
        -1, 0,  1,
         1, 0,  1,
         1, 0, -1,
        -1, 0, -1
    ];
    let uvs = [
        0, 0,
        1, 0,
        1, 1,
        0, 1
    ];
    let indicies = [
        0, 1, 2,
        2, 3, 0
    ];

    // create vertex attribute buffer
    let vertexatbuf = {};
    vertexatbuf.id = gl.createBuffer();
    vertexatbuf.loc = 0;
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexatbuf.id);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(vertexatbuf.loc);
    gl.vertexAttribPointer(vertexatbuf.loc, 3, gl.FLOAT, false, 0, 0);

    // create uv attribute buffer
    let uvatbuf = {};
    uvatbuf.id = gl.createBuffer();
    uvatbuf.loc = 1;
    gl.bindBuffer(gl.ARRAY_BUFFER, uvatbuf.id);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uvs), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(uvatbuf.loc);
    gl.vertexAttribPointer(uvatbuf.loc, 2, gl.FLOAT, false, 0, 0);

    // create element buffer
    let elementatbuf = {};
    elementatbuf.id = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elementatbuf.id);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indicies), gl.STATIC_DRAW);

    checkError("after vbo setup");

    //
    // create shader program
    //

    const Shader =
    {
        vertex:
    `attribute vec4 vertex;
    attribute vec2 uv;
    uniform mat4 mvpmat;
    varying vec2 texcoord;
    void main() {
       gl_Position = mvpmat * vertex;
       texcoord = uv;
    }`,
    
        fragment:
    `precision mediump float;
     varying vec2 texcoord;
    
    float checker(vec2 uv, float repeats) 
    {
      float cx = floor(repeats * uv.x);
      float cy = floor(repeats * uv.y); 
      float result = mod(cx + cy, 2.0);
      return sign(result);
    }
    
    void main()
    {
      gl_FragColor = mix(vec4(0.1, 0.8, 0.1, 1.0), vec4(0.1, 0.4, 0.1, 1.0), checker(texcoord, 10.0));
    }`
    };

    let loadShader = function(type, source)
    {
        const s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        const vertcompiled = gl.getShaderParameter(s, gl.COMPILE_STATUS);
        if (!vertcompiled)
        {
            console.log('Compile Error: ' + gl.getShaderInfoLog(s));
            gl.deleteShader(s);
            return null;
        }
        return s;
    };

    // compile shaders
    const vertshader = loadShader(gl.VERTEX_SHADER, Shader.vertex);
    const fragshader = loadShader(gl.FRAGMENT_SHADER, Shader.fragment);
    if(!vertshader || !fragshader) return;

    // create program
    const program = gl.createProgram();
    gl.attachShader(program, vertshader);
    gl.attachShader(program, fragshader);

    // bind attribute locations
    gl.bindAttribLocation(program, vertexatbuf.loc, 'vertex');
    gl.bindAttribLocation(program, uvatbuf.loc, 'uv');

    // link program
    gl.linkProgram(program);

    // delete shaders now program is linked
    gl.deleteShader(vertshader);
    gl.deleteShader(fragshader);

    // check for errors
    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked)
    {
        console.log('Link Error: ' + gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return;
    }

    // get mvpmat uniform location
    const mvpmatLoc = gl.getUniformLocation(program, "mvpmat");

    checkError("after program setup");

    //
    // Setp transforms
    //
    let view = glMatrix.mat4.create();
    glMatrix.mat4.lookAt( view, [0,0,0], [0,0,-1], [0, 1, 0]);

    let projection = glMatrix.mat4.create();
    glMatrix.mat4.perspective( projection, glMatrix.glMatrix.toRadian(60.0), w/h, 0.01, 100.0);

    //let rotation = glMatrix.quat.setAxisAngle(glMatrix.quat.create(), [1.0, 0.0, 0.0], glMatrix.glMatrix.toRadian(90));
    let rotation = glMatrix.quat.fromEuler(glMatrix.quat.create(), 45, 45, 45);
    let position = [0, -0.5, -2.5];

    let model = glMatrix.mat4.create();
    glMatrix.mat4.fromRotationTranslation(model, rotation, position);

    // combine in mvp mat
    var modelview = glMatrix.mat4.create();
    glMatrix.mat4.multiply(modelview, view, model);

    var modelviewProjection = glMatrix.mat4.create();
    glMatrix.mat4.multiply( modelviewProjection, projection, modelview);

    //
    // draw, the fbo is still bound so will be our render target
    //
    gl.enable(gl.DEPTH_TEST);
    //gl.disable(gl.CULL_FACE);

    gl.viewport(0, 0, w, h);

    gl.clearColor(0, 0, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);

    checkError("after use program");

    // set the mvpmat uniform
    gl.uniformMatrix4fv(mvpmatLoc, false, modelviewProjection);

    checkError("after uniform apply");

    gl.drawElements(gl.TRIANGLES, indicies.length, gl.UNSIGNED_SHORT, 0);

    // to aid debugging clear the top left corner
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(0, h-10, 10, 10);
    gl.clearColor(1, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    checkError("after draw");
}

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
module.exports = {
    runDemo: runDemo,
};