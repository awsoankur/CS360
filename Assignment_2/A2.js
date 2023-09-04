var gl;
var canvas;

var matrixStack = [];

var buf;
var indexBuf;
var aPositionLocation;
var aNormalLocation;
var uColorLocation;
var uPMatrixLocation;
var uMMatrixLocation;
var uVMatrixLocation;
var uLightLocation;

var degreel1 = 0.0;
var degreel0 = 0.0;
var degreem1 = 0.0;
var degreem0 = 0.0;
var degreer1 = 0.0;
var degreer0 = 0.0;
var prevMouseX = 0.0;
var prevMouseY = 0.0;

// initialize model, view, and projection matrices
var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix

// specify camera/eye coordinate system parameters
var eyePos = [0.0, 0.4, 2.0];
var COI = [0.0, 0.0, 0.0];
var viewUp = [0.0, 1.0, 0.0];

// specify light coordinates
var light = [0.0, 5.0, 5.0];

var buf;
var indexBuf;
var cubeNormalBuf;
var spBuf;
var spIndexBuf;
var spNormalBuf;
var color =[];

var spVerts = [];
var spIndicies = [];
var spNormals = [];

// shader programs
var perVertshaderProgram;
var perFragshaderProgram;
var flatshaderProgram;
var shaderProgram;


// Vertex shader code for PER FRAGMENT SHADING
const perFragVertexShaderCode =`#version 300 es
precision mediump float;
in vec3 aPosition;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
in vec3 aNormal;
uniform vec3 eyePos;
out vec3 posInEyeSpace;
out vec3 anorm;

void main() {
  mat4 projectionModelView;
	projectionModelView=uPMatrix*uVMatrix*uMMatrix;
  gl_Position = projectionModelView*vec4(aPosition,1.0);
  gl_PointSize=2.5;
  posInEyeSpace = (uVMatrix*uMMatrix*vec4(aPosition,1.0)).xyz;
  anorm = aNormal;
}`;

// Fragment shader code for PER VERTEX SHADING
const perFragFragShaderCode=`#version 300 es
precision mediump float;
out vec4 fragColor;
uniform vec4 objColor;
in vec3 anorm;
uniform mat4 uVMatrix;
uniform mat4 uMMatrix;
uniform vec3 lightPos;
in vec3 posInEyeSpace;

void main() {
  vec3 normal = normalize(transpose( inverse( mat3(uVMatrix*uMMatrix) ) ) * anorm);
  vec3 L = normalize((uVMatrix*vec4(lightPos,0.0)).xyz-posInEyeSpace);
  vec3 R = normalize(-reflect(L,normal)); 
  vec3 V = normalize(-posInEyeSpace);
  mediump float diff = max(dot(L,normal),0.0);
  mediump float spec = max(dot(R,V),-0.1);
  fragColor = objColor * (0.2 + 1.0*diff) + vec4(1,1,1,0)*pow(spec,10.0);
  fragColor.a=1.0;
}`;

// Vertex shader code for PER VERTEX SHADING
const perVertVertexShaderCode =`#version 300 es
in vec3 aPosition;
in vec3 aNormal;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform vec3 eyePos;
uniform vec4 objColor;
uniform vec3 lightPos;
out vec3 posInEyeSpace;
out vec4 vertexColor;

void main() {
  mat4 projectionModelView;
	projectionModelView=uPMatrix*uVMatrix*uMMatrix;
  gl_Position = projectionModelView*vec4(aPosition,1.0);
  gl_PointSize = 2.5;
  posInEyeSpace = vec3(uVMatrix*uMMatrix*vec4(aPosition,1.0));

  vec3 normal = normalize(transpose( inverse( mat3(uVMatrix*uMMatrix) ) ) * aNormal);
  vec3 L = normalize((uVMatrix * vec4( lightPos,1.0 ) ).xyz -posInEyeSpace);
  vec3 R = normalize(-reflect(L,normal));
  vec3 V = normalize(-posInEyeSpace);
  mediump float diff = max(dot(L,normal),0.0);
  mediump float spec = max(dot(R,V),0.0);
  vertexColor = objColor * (0.2 + 1.0*diff) + vec4(1,1,1,0)*pow(spec,40.0);
  vertexColor.a = 1.0;
}`; 

// Fragment shader code for PER VERTEX SHADING
const perVertFragShaderCode=`#version 300 es
precision mediump float;
out vec4 fragColor;
in vec4 vertexColor;

void main() {
  fragColor = vertexColor;
}`;

// Vertex shader code for FLAT SHADING
const flatShadingVertexShaderCode = `#version 300 es
in vec3 aPosition;
uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;
uniform vec3 eyePos;
out vec3 posInEyeSpace;
out mat4 uvm;

void main() {
  mat4 projectionModelView;
	projectionModelView=uPMatrix*uVMatrix*uMMatrix;
  gl_Position = projectionModelView*vec4(aPosition,1.0);
  gl_PointSize=2.5;
  posInEyeSpace = (uVMatrix*uMMatrix*vec4(aPosition,1.0)).xyz;
  uvm = uVMatrix;
}`;

// Fragment shader code for FLAT SHADING
const flatShadingFragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;
uniform vec4 objColor;
// uniform mat4 uVMatrix;
in mat4 uvm;
uniform vec3 lightPos;
in vec3 posInEyeSpace;

void main() {
  vec3 normal = normalize(cross(dFdx(posInEyeSpace), dFdy(posInEyeSpace)));
  vec3 L = normalize((uvm*vec4(lightPos,0.0)).xyz);
  vec3 R = normalize(-reflect(L,normal)); 
  vec3 V = normalize(-posInEyeSpace);
  mediump float diff = max(dot(L,normal),0.0);
  mediump float spec = max(dot(R,V),0.0);
  fragColor = objColor * (0.2 + 1.0*diff) + vec4(1,1,1,0)*pow(spec,20.0);
  fragColor.a=1.0;
}`;


function cameraPos(value) {
  eyePos[2] = Number(value);
  drawScene()
}

function lightPosChange(value) {
  light[0] = Number(value);
  drawScene()
}

function leftPort() {
  // set shader program
  shaderProgram = flatshaderProgram;
  gl.useProgram(shaderProgram);
  gl.enable(gl.SCISSOR_TEST);

  // set variables and attributes or shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  uLightLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");
  uEyeLocation = gl.getUniformLocation(shaderProgram, "eyePos");

  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);

  // setup viewport
  gl.viewport(0, 0, 500, 500);
  gl.scissor(0, 0, 500, 500);
  gl.clearColor(0.85, 0.85, 0.95, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function drawLeftScene() {
  // Now draw the cube
  color = [0.69, 0.69, 0.49, 1]; // specify color for the cube
  
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.scale(mMatrix,[1,1.8,1]);
  drawCube(color);
  mMatrix = popMatrix(matrixStack);

  color = [0,0.41,0.6,1];

  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix,[0,1.4,0,0]);
  mMatrix = mat4.scale(mMatrix,[0.5,0.5,0.5,1]);
  drawSphere(color);
  mMatrix = popMatrix(matrixStack);
}

function middlePort() {
  // set shader program
  shaderProgram = perVertshaderProgram;
  gl.useProgram(shaderProgram);
  gl.enable(gl.SCISSOR_TEST);

  // set variables and attributes or shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  uLightLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");
  uEyeLocation = gl.getUniformLocation(shaderProgram, "eyePos");

  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);

  // setup viewport
  gl.viewport(500, 0, 500, 500);
  gl.scissor(500, 0, 500, 500);
  gl.clearColor(0.95,0.85 , 0.95, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function drawMiddleScene() {

  var sphcolor = [0.8,0.8,0.8,1.0];
  var cubcolor = [0,0.8,0,1];
  // centre sphere
  pushMatrix(matrixStack,mMatrix);
  // mMatrix = mat4.translate(mMatrix,[0,0,0,0]);
  mMatrix = mat4.scale(mMatrix,[0.5,0.5,0.5,1]);
  drawSphere(sphcolor);
  mMatrix = popMatrix(matrixStack);

  middlehelper(sphcolor,cubcolor);

  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix,[0.15,1.1,-0.3,0]);
  mMatrix = mat4.rotate(mMatrix,degToRad(45),[1,1,1]);
  mMatrix = mat4.scale(mMatrix,[0.7,0.7,0.7,1]);
  middlehelper(sphcolor,cubcolor);
  mMatrix = popMatrix(matrixStack);

}

function middlehelper(sphcolor,cubcolor) {
  // cube 1
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix,[-0.8,0.1,0,0]);
  mMatrix = mat4.scale(mMatrix,[0.6,0.6,0.6,1]);
  drawCube(cubcolor);
  mMatrix = popMatrix(matrixStack);
  
  // sphere 2
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix,[-0.8,0.7,0,0]);
  mMatrix = mat4.scale(mMatrix,[0.3,0.3,0.3,1]);
  drawSphere(sphcolor);
  mMatrix = popMatrix(matrixStack);
}

function rightPort() {
  // set shader program
  shaderProgram = perFragshaderProgram;
  gl.useProgram(shaderProgram);
  gl.enable(gl.SCISSOR_TEST);

  // set variables and attributes or shader
  aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
  uLightLocation = gl.getUniformLocation(shaderProgram, "lightPos");
  aNormalLocation = gl.getAttribLocation(shaderProgram, "aNormal");
  uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
  uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
  uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
  uColorLocation = gl.getUniformLocation(shaderProgram, "objColor");
  uEyeLocation = gl.getUniformLocation(shaderProgram, "eyePos");

  gl.enableVertexAttribArray(aPositionLocation);
  gl.enableVertexAttribArray(aNormalLocation);

  // setup viewport
  gl.viewport(1000, 0, 500, 500);
  gl.scissor(1000, 0, 500, 500);
  gl.clearColor(0.85, 0.95, 0.85, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function drawRightScene() {
  // bottom sphere
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix,[0,-1,0]);
  mMatrix = mat4.scale(mMatrix,[0.4,0.4,0.4]);
  drawSphere([0,1,0,1]);
  mMatrix = popMatrix(matrixStack);
  // bottom slab
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix,[0,-0.6,0]);
  mMatrix = mat4.scale(mMatrix,[2.4,0.1,0.6]);
  drawCube([0.6,0.1,0.0,1]);
  mMatrix = popMatrix(matrixStack);

  // bottom left ball
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix,[-0.8,-0.26,0]);
  mMatrix = mat4.scale(mMatrix,[0.3,0.3,0.3]);
  drawSphere([0.37,0.40,0.77,1]);
  mMatrix = popMatrix(matrixStack);
  // bottom right ball
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix,[0.8,-0.26,0]);
  mMatrix = mat4.scale(mMatrix,[0.3,0.3,0.3]);
  drawSphere([0,0.7,0.7,1]);
  mMatrix = popMatrix(matrixStack);

  // middle slab left
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix,[-0.8,0.08,0]);
  mMatrix = mat4.rotate(mMatrix,degToRad(90),[0,1,0]);
  mMatrix = mat4.scale(mMatrix,[2.4,0.1,0.6]);
  drawCube([1,1,0,1]);
  mMatrix = popMatrix(matrixStack);
  // middle slab right
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix,[0.8,0.08,0]);
  mMatrix = mat4.rotate(mMatrix,degToRad(90),[0,1,0]);
  mMatrix = mat4.scale(mMatrix,[2.4,0.1,0.6]);
  drawCube([0.20,0.61,0.51,1]);
  mMatrix = popMatrix(matrixStack);

  // top left ball
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix,[-0.8,0.45,0]);
  mMatrix = mat4.scale(mMatrix,[0.3,0.3,0.3]);
  drawSphere([1,0,1,1]);
  mMatrix = popMatrix(matrixStack);
  // top right ball
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix,[0.8,0.45,0]);
  mMatrix = mat4.scale(mMatrix,[0.3,0.3,0.3]);
  drawSphere([0.48,0.35,0.11,1]);
  mMatrix = popMatrix(matrixStack);  

  // top slab 
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix,[0,0.8,0]);
  mMatrix = mat4.scale(mMatrix,[2.4,0.1,0.6]);
  drawCube([0.6,0.1,0.0,1]);
  mMatrix = popMatrix(matrixStack);

  // top ball
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix,[0,1.23,0]);
  mMatrix = mat4.scale(mMatrix,[0.4,0.4,0.4]);
  drawSphere([0.47,0.47,0.6,1]);
  mMatrix = popMatrix(matrixStack);
}

function pushMatrix(stack, m) {
  //necessary because javascript only does shallow push
	var copy = mat4.create(m);
	stack.push(copy);
}

function popMatrix(stack) {
	if (stack.length > 0) return stack.pop();
	else console.log("stack has no matrix to pop!");
}

function initSphere(nslices, nstacks, radius) {
  var theta1, theta2;

  for (i = 0; i < nslices; i++) {
    spVerts.push(0);
    spVerts.push(-radius);
    spVerts.push(0);

    spNormals.push(0);
    spNormals.push(-1.0);
    spNormals.push(0);
  }

  for (j = 1; j < nstacks - 1; j++) {
    theta1 = (j * 2 * Math.PI) / nslices - Math.PI / 2;
    for (i = 0; i < nslices; i++) {
      theta2 = (i * 2 * Math.PI) / nslices;
      spVerts.push(radius * Math.cos(theta1) * Math.cos(theta2));
      spVerts.push(radius * Math.sin(theta1));
      spVerts.push(radius * Math.cos(theta1) * Math.sin(theta2));

      spNormals.push(Math.cos(theta1) * Math.cos(theta2));
      spNormals.push(Math.sin(theta1));
      spNormals.push(Math.cos(theta1) * Math.sin(theta2));
    }
  }

  for (i = 0; i < nslices; i++) {
    spVerts.push(0);
    spVerts.push(radius);
    spVerts.push(0);

    spNormals.push(0);
    spNormals.push(1.0);
    spNormals.push(0);
  }

  // setup the connectivity and indices
  for (j = 0; j < nstacks - 1; j++)
    for (i = 0; i <= nslices; i++) {
      var mi = i % nslices;
      var mi2 = (i + 1) % nslices;
      var idx = (j + 1) * nslices + mi;
      var idx2 = j * nslices + mi;
      var idx3 = j * nslices + mi2;
      var idx4 = (j + 1) * nslices + mi;
      var idx5 = j * nslices + mi2;
      var idx6 = (j + 1) * nslices + mi2;

      spIndicies.push(idx);
      spIndicies.push(idx2);
      spIndicies.push(idx3);
      spIndicies.push(idx4);
      spIndicies.push(idx5);
      spIndicies.push(idx6);
    }
}

function initSphereBuffer() {
  var nslices = 30; // use even number
  var nstacks = nslices / 2 + 1;
  var radius = 1.0;
  initSphere(nslices, nstacks, radius);

  spBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
  spBuf.itemSize = 3;
  spBuf.numItems = nslices * nstacks;

  spNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
  spNormalBuf.itemSize = 3;
  spNormalBuf.numItems = nslices * nstacks;

  spIndexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(spIndicies),
    gl.STATIC_DRAW
  );
  spIndexBuf.itemsize = 1;
  spIndexBuf.numItems = (nstacks - 1) * 6 * (nslices + 1);
}

function drawSphere(color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
  gl.vertexAttribPointer(
    aPositionLocation,
    spBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // for normals
  gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
  gl.vertexAttribPointer(
    aNormalLocation,
    spNormalBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // draw elementary arrays - triangle indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

  gl.uniform3fv(uEyeLocation, eyePos);
  gl.uniform4fv(uColorLocation, color);
  gl.uniform3fv(uLightLocation, light);

  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
}

// Cube generation function with normals
function initCubeBuffer() {
  var vertices = [
    // Front face
    -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    // Back face
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
    // Top face
    -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
    // Bottom face
    -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
    // Right face
    0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
    // Left face
    -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5,
  ];
  buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  buf.itemSize = 3;
  buf.numItems = vertices.length / 3;

  var normals = [
    // Front face
    0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
    // Back face
    0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0,
    // Top face
    0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    // Bottom face
    0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
    // Right face
    1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
    // Left face
    -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
  ];
  cubeNormalBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
  cubeNormalBuf.itemSize = 3;
  cubeNormalBuf.numItems = normals.length / 3;


  var indices = [
    0,
    1,
    2,
    0,
    2,
    3, // Front face
    4,
    5,
    6,
    4,
    6,
    7, // Back face
    8,
    9,
    10,
    8,
    10,
    11, // Top face
    12,
    13,
    14,
    12,
    14,
    15, // Bottom face
    16,
    17,
    18,
    16,
    18,
    19, // Right face
    20,
    21,
    22,
    20,
    22,
    23, // Left face
  ];
  indexBuf = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(indices),
    gl.STATIC_DRAW
  );
  indexBuf.itemSize = 1;
  indexBuf.numItems = indices.length;
}

function drawCube(color) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.vertexAttribPointer(
    aPositionLocation,
    buf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );

  // for normals
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuf);
  gl.vertexAttribPointer(
    aNormalLocation,
    cubeNormalBuf.itemSize,
    gl.FLOAT,
    false,
    0,
    0
  );


  // draw elementary arrays - triangle indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);

  gl.uniform3fv(uEyeLocation, eyePos);
  gl.uniform3fv(uLightLocation, light);
  gl.uniform4fv(uColorLocation, color);
  gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
  gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
  gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);

  gl.drawElements(gl.TRIANGLES, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);
  //gl.drawArrays(gl.LINE_STRIP, 0, buf.numItems); // show lines
  //gl.drawArrays(gl.POINTS, 0, buf.numItems); // show points
}

function vertexShaderSetup(vertexShaderCode) {
  shader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(shader, vertexShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function fragmentShaderSetup(fragShaderCode) {
  shader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(shader, fragShaderCode);
  gl.compileShader(shader);
  // Error check whether the shader is compiled correctly
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

function initShaders(vertexShaderCode,fragShaderCode) {
  shaderProgram = gl.createProgram();

  var vertexShader = vertexShaderSetup(vertexShaderCode);
  var fragmentShader = fragmentShaderSetup(fragShaderCode);

  // attach the shaders
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  //link the shader program
  gl.linkProgram(shaderProgram);

  // check for compilation and linking status
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log(gl.getShaderInfoLog(vertexShader));
    console.log(gl.getShaderInfoLog(fragmentShader));
  }

  //finally use the program.
  gl.useProgram(shaderProgram);
  gl.enable(gl.SCISSOR_TEST);

  return shaderProgram;
}

function initGL(canvas) {
  try {
    gl = canvas.getContext("webgl2"); // the graphics webgl2 context
    gl.viewportWidth = canvas.width; // the width of the canvas
    gl.viewportHeight = canvas.height; // the height
  } catch (e) {}
  if (!gl) {
    alert("WebGL initialization failed");
  }
}

function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}


//////////////////////////////////////////////////////////////////////
//Main drawing routine
function drawScene() {
  
  // set up the view matrix, multiply into the modelview matrix
  mat4.identity(vMatrix);
  vMatrix = mat4.lookAt(eyePos, COI, viewUp, vMatrix);
  
  //set up perspective projection matrix
  mat4.identity(pMatrix);
  mat4.perspective(50, 1.0, 0.1, 1000, pMatrix);
  
  //set up the model matrix
  mat4.identity(mMatrix);
  mMatrix = mat4.scale(mMatrix,[0.5,0.5,0.5,1]);


  leftPort();
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.rotate(mMatrix, degToRad(degreel0), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degreel1), [1, 0, 0]);
  mMatrix = mat4.translate(mMatrix,[0,-0.4,0,0]);
  drawLeftScene();
  mMatrix = popMatrix(matrixStack);

  middlePort();
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix,[0.4,-0.5,0,0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degreem0), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degreem1), [1, 0, 0]);
  mMatrix = mat4.scale(mMatrix,[1.4,1.4,1.4,1]);
  drawMiddleScene();
  mMatrix = popMatrix(matrixStack);


  rightPort();
  pushMatrix(matrixStack,mMatrix);
  mMatrix = mat4.translate(mMatrix,[0,-0.1,0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degreer0), [0, 1, 0]);
  mMatrix = mat4.rotate(mMatrix, degToRad(degreer1), [1, 0, 0]);
  drawRightScene();
  mMatrix = popMatrix(matrixStack);

}

function onMouseDown(event) {
  document.addEventListener("mousemove", onMouseMove, false);
  document.addEventListener("mouseup", onMouseUp, false);
  document.addEventListener("mouseout", onMouseOut, false);

  if (
    event.layerX <= canvas.width &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    prevMouseX = event.clientX;
    prevMouseY = canvas.height - event.clientY;
  }
}

function onMouseMove(event) {
  // make mouse interaction only within canvas
  if (
    event.layerX <= canvas.width &&
    event.layerX >= 0 &&
    event.layerY <= canvas.height &&
    event.layerY >= 0
  ) {
    if (event.layerX<=canvas.width/3)
    {
      var mouseX = event.clientX;
      var diffX1 = mouseX - prevMouseX;
      prevMouseX = mouseX;
      degreel0 = degreel0 + diffX1 / 5;

      var mouseY = canvas.height - event.clientY;
      var diffY2 = mouseY - prevMouseY;
      prevMouseY = mouseY;
      degreel1 = degreel1 - diffY2 / 5;
    }
    else if (event.layerX<=2*canvas.width/3)
    {
      var mouseX = event.clientX;
      var diffX1 = mouseX - prevMouseX;
      prevMouseX = mouseX;
      degreem0 = degreem0 + diffX1 / 5;

      var mouseY = canvas.height - event.clientY;
      var diffY2 = mouseY - prevMouseY;
      prevMouseY = mouseY;
      degreem1 = degreem1 - diffY2 / 5;
    }
    else if (event.layerX<=canvas.width)
    {
      var mouseX = event.clientX;
      var diffX1 = mouseX - prevMouseX;
      prevMouseX = mouseX;
      degreer0 = degreer0 + diffX1 / 5;

      var mouseY = canvas.height - event.clientY;
      var diffY2 = mouseY - prevMouseY;
      prevMouseY = mouseY;
      degreer1 = degreer1 - diffY2 / 5;
    }

    drawScene();
  }
}

function onMouseUp(event) {
  document.removeEventListener("mousemove", onMouseMove, false);
  document.removeEventListener("mouseup", onMouseUp, false);
  document.removeEventListener("mouseout", onMouseOut, false);
}

function onMouseOut(event) {
  document.removeEventListener("mousemove", onMouseMove, false);
  document.removeEventListener("mouseup", onMouseUp, false);
  document.removeEventListener("mouseout", onMouseOut, false);
}

// This is the entry point from the html
function webGLStart() {
  canvas = document.getElementById("A2");
  document.addEventListener("mousedown", onMouseDown, false);

  // initialize WebGL
  initGL(canvas);

  // initialize shader program
  flatshaderProgram = initShaders(flatShadingVertexShaderCode,flatShadingFragShaderCode);
  perVertshaderProgram = initShaders(perVertVertexShaderCode,perVertFragShaderCode);
  perFragshaderProgram = initShaders(perFragVertexShaderCode,perFragFragShaderCode);

  //initialize buffers for the square
  initCubeBuffer();
  initSphereBuffer();

  gl.enable(gl.DEPTH_TEST);

  drawScene();
}
