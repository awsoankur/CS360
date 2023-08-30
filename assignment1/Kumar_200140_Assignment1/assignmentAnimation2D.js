////////////////////////////////////////////////////////////////////////
// A simple WebGL program to draw simple 2D shapes with animation.
//

var gl;
var color;
var animation;
var degreeSun = 0;
var boatDisp = -1;
var boatDir = 1;
var cloudDisp = 0;
var cloudDir = 1;
var degreeWindmill = 0;
var bushValue = 0;
var bushDir = 1;
var waveDisp = 0;
var birdDir = 1;
var birdDisp = 0;
var matrixStack = [];

var displayState;

// mMatrix is called the model matrix, transforms objects
// from local object space to world space.
var mMatrix = mat4.create();
var uMMatrixLocation;
var aPositionLocation;
var uColorLoc;

var mountVertexPositionBuffer;
var mountVertexIndexBuffer;
var mountShadowVertexPositionBuffer;
var mountShadowVertexIndexBuffer;
var sunVertexPositionBuffer;
var sunVertexIndexBuffer;
var cloudVertexPositionBuffer;
var cloudVertexIndexBuffer;
var sqVertexIndexBuffer;
var sqVertexPositionBuffer;
var trapVertexIndexBuffer;
var trapVertexPostitionBuffer;

const vertexShaderCode = `#version 300 es
in vec2 aPosition;
uniform mat4 uMMatrix;

void main() {
  gl_Position = uMMatrix*vec4(aPosition,0.0,1.0);
  gl_PointSize = 2.5;
}`;

const fragShaderCode = `#version 300 es
precision mediump float;
out vec4 fragColor;

uniform vec4 color;

void main() {
  fragColor = color;
}`;

function pushMatrix(stack, m) {
	//necessary because javascript only does shallow push
	var copy = mat4.create(m);
	stack.push(copy);
}

function popMatrix(stack) {
	if (stack.length > 0) return stack.pop();
	else console.log("stack has no matrix to pop!");
}

function degToRad(degrees) {
	return (degrees * Math.PI) / 180;
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

function initShaders() {
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

	return shaderProgram;
}

function initGL(canvas) {
	try {
		gl = canvas.getContext("webgl2"); // the graphics webgl2 context
		gl.viewportWidth = canvas.width; // the width of the canvas
		gl.viewportHeight = canvas.height; // the height
	} catch (e) { }
	if (!gl) {
		alert("WebGL initialization failed");
	}
}

function buttonClick(butt){
	if (butt=='point')
		displayState = gl.POINTS;
	else if (butt=='wireframe')
		displayState = gl.LINE_LOOP;
	else
		displayState = gl.TRIANGLES;
}
function initCircleBuffer(){
	const r = 0.1,lim=20;
	var border = [0,0];
	var cindex = [];
	//circle points
	for (let index = 0; index < lim; index++) {
		border.push(r*Math.sin(index *2* Math.PI / lim));
		border.push(r*Math.cos(index *2* Math.PI / lim));
	}

	for (let index = 0; index < lim-1; index++) {
		cindex.push(0);
		cindex.push(index+1);
		cindex.push(index+2);
	}
	cindex.push(0);
	cindex.push(1);
	cindex.push(lim);
	const sunb = new Float32Array(border);
	
	cloudVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER,cloudVertexPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER,sunb,gl.STATIC_DRAW);
	cloudVertexPositionBuffer.itemSize = 2;
	cloudVertexPositionBuffer.numItems = border.length/2;
	
	const suni = new Uint16Array(cindex);
	
	cloudVertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,cloudVertexIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,suni,gl.STATIC_DRAW);
	cloudVertexIndexBuffer.itemSize = 1;
	cloudVertexIndexBuffer.numItems = cindex.length;	
}

function drawCircle(color,mMatrix) {
	gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

	// buffer for point locations
	gl.bindBuffer(gl.ARRAY_BUFFER, cloudVertexPositionBuffer);
	gl.vertexAttribPointer(
		aPositionLocation,
		cloudVertexPositionBuffer.itemSize,
		gl.FLOAT,
		false,
		0,
		0
	);

	// buffer for point indices
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cloudVertexIndexBuffer);

	// color =[1, 1, 1, 1];
	gl.uniform4fv(uColorLoc, color);

	// now draw the circle
	gl.drawElements(
		displayState,
		cloudVertexIndexBuffer.numItems,
		gl.UNSIGNED_SHORT,
		0
	);
}

function drawSun() {

	color = [1,1,0,1];

	drawCircle(color,mMatrix);

	// rays 
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.rotate(mMatrix,degToRad(0),[0,0,1]);
	mMatrix = mat4.translate(mMatrix,[0.1,0,0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(90),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[0.01,0.15,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.rotate(mMatrix,degToRad(360/8),[0,0,1]);
	mMatrix = mat4.translate(mMatrix,[0.1,0,0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(90),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[0.01,0.15,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.rotate(mMatrix,degToRad(360*2/8),[0,0,1]);
	mMatrix = mat4.translate(mMatrix,[0.1,0,0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(90),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[0.01,0.15,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.rotate(mMatrix,degToRad(3*360/8),[0,0,1]);
	mMatrix = mat4.translate(mMatrix,[0.1,0,0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(90),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[0.01,0.15,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.rotate(mMatrix,degToRad(4*360/8),[0,0,1]);
	mMatrix = mat4.translate(mMatrix,[0.1,0,0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(90),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[0.01,0.15,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.rotate(mMatrix,degToRad(5*360/8),[0,0,1]);
	mMatrix = mat4.translate(mMatrix,[0.1,0,0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(90),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[0.01,0.15,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.rotate(mMatrix,degToRad(6*360/8),[0,0,1]);
	mMatrix = mat4.translate(mMatrix,[0.1,0,0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(90),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[0.01,0.15,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.rotate(mMatrix,degToRad(7*360/8),[0,0,1]);
	mMatrix = mat4.translate(mMatrix,[0.1,0,0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(90),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[0.01,0.15,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

}

function drawTrap(color,mMatrix){

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.scale(mMatrix,[0.75,0.75,1]);
	drawTriangle(color,mMatrix);
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.5,0,0])
	mMatrix = mat4.rotate(mMatrix,degToRad(180),[0,0,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.5,0,0])
	mMatrix = mat4.rotate(mMatrix,degToRad(180),[0,0,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	mMatrix = popMatrix(matrixStack);


	// gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

	// // buffer for point locations
	// gl.bindBuffer(gl.ARRAY_BUFFER, trapVertexPostitionBuffer);
	// gl.vertexAttribPointer(
	// 	aPositionLocation,
	// 	trapVertexPostitionBuffer.itemSize,
	// 	gl.FLOAT,
	// 	false,
	// 	0,
	// 	0
	// );

	// // buffer for point indices
	// gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, trapVertexIndexBuffer);

	// gl.uniform4fv(uColorLoc, color);

	// // now draw the square
	// gl.drawElements(
	// 	gl.TRIANGLES,
	// 	trapVertexIndexBuffer.numItems,
	// 	gl.UNSIGNED_SHORT,
	// 	0
	// );
}

function initSquareBuffer() {
	// buffer for point locations
	const sqVertices = new Float32Array([
		0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
	]);
	sqVertexPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
	sqVertexPositionBuffer.itemSize = 2;
	sqVertexPositionBuffer.numItems = 4;

	// buffer for point indices
	const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
	sqVertexIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
	sqVertexIndexBuffer.itemsize = 1;
	sqVertexIndexBuffer.numItems = 6;
}

function drawSquare(color, mMatrix) {
	gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

	// buffer for point locations
	gl.bindBuffer(gl.ARRAY_BUFFER, sqVertexPositionBuffer);
	gl.vertexAttribPointer(
		aPositionLocation,
		sqVertexPositionBuffer.itemSize,
		gl.FLOAT,
		false,
		0,
		0
	);

	// buffer for point indices
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqVertexIndexBuffer);

	gl.uniform4fv(uColorLoc, color);

	// now draw the square
	gl.drawElements(
		displayState,
		sqVertexIndexBuffer.numItems,
		gl.UNSIGNED_SHORT,
		0
	);
}

function initTriangleBuffer() {
	// buffer for point locations
	const triangleVertices = new Float32Array([0.0, 0.5, -0.5, -0.5, 0.5, -0.5]);
	triangleBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
	gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
	triangleBuf.itemSize = 2;
	triangleBuf.numItems = 3;

	// buffer for point indices
	const triangleIndices = new Uint16Array([0, 1, 2]);
	triangleIndexBuf = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triangleIndices, gl.STATIC_DRAW);
	triangleIndexBuf.itemsize = 1;
	triangleIndexBuf.numItems = 3;
}

function drawTriangle(color, mMatrix) {
	gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);

	// buffer for point locations
	gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuf);
	gl.vertexAttribPointer(
		aPositionLocation,
		triangleBuf.itemSize,
		gl.FLOAT,
		false,
		0,
		0
	);

	// buffer for point indices
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleIndexBuf);

	gl.uniform4fv(uColorLoc, color);

	// now draw the square
	gl.drawElements(
		displayState,
		triangleIndexBuf.numItems,
		gl.UNSIGNED_SHORT,
		0
	);
}

function drawMountains() {

	color =[162/255, 82/255, 45/255, 1];


	color =[162/255 *0.75, 82/255*0.75, 45/255*0.75, 1];
	
	//left mountain shadow
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.75,0,0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(-10),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[1.7,0.45,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	console.log(mMatrix);

	color =[162/255, 82/255, 45/255, 1];

	//left mountain
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.7,0,0]);
	mMatrix = mat4.scale(mMatrix,[1.7,0.45,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	console.log(mMatrix);


	color =[162/255 *0.75, 82/255*0.75, 45/255*0.75, 1];
	
	//centre mountain shadow
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.03,0,0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(-5),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[2.5,0.6,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	console.log(mMatrix);


	color =[162/255, 82/255, 45/255, 1];

	// center mountain
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0,0,0]);
	mMatrix = mat4.scale(mMatrix,[2.5,0.6,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	console.log(mMatrix);


	color =[162/255, 82/255, 45/255, 1];

	// right mountain
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.8,0,0]);
	mMatrix = mat4.scale(mMatrix,[1.8,0.3,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	console.log(mMatrix);
}

function drawClouds(){
	// cloud 1
	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix, [-0.9, 0.45, 0.0]);
	mMatrix = mat4.scale(mMatrix, [2, 1.2, 1.0]);
	color = [1, 1, 1, 1];
	drawCircle(color, mMatrix);
	mMatrix = popMatrix(matrixStack);

	// cloud 2
	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix, [-0.65, 0.43, 0.0]);
	mMatrix = mat4.scale(mMatrix, [1.6, 1, 1.0]);
	color = [1, 1, 1, 1];
	drawCircle(color, mMatrix);
	mMatrix = popMatrix(matrixStack);

	// cloud 3
	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix, [-0.5, 0.48, 0.0]);
	mMatrix = mat4.scale(mMatrix, [1.2, 0.8, 1.0]);
	color = [1, 1, 1, 1];
	drawCircle(color, mMatrix);
	mMatrix = popMatrix(matrixStack);
}

function drawGround(){
	color = [144/255,238/255,144/255,1.0];

		// mountain ground
		pushMatrix(matrixStack, mMatrix);
		mMatrix = mat4.translate(mMatrix, [0, -0.05, 0.0]);
		mMatrix = mat4.scale(mMatrix, [2, 0.1, 1.0]);
		drawSquare(color,mMatrix);
		mMatrix = popMatrix(matrixStack);

		// mainland ground
		pushMatrix(matrixStack, mMatrix);
		mMatrix = mat4.translate(mMatrix, [0, -0.7, 0.0]);
		mMatrix = mat4.scale(mMatrix, [2, 0.8, 1.0]);
		drawSquare(color,mMatrix);
		mMatrix = popMatrix(matrixStack);


		// pathway 
		color = [144/255*0.7,238/255*0.7,144/255*0.7,1.0];
		pushMatrix(matrixStack, mMatrix);
		mMatrix = mat4.translate(mMatrix,[0.5,-0.88,0]);
		mMatrix = mat4.scale(mMatrix,[1.8,2.2,0]);
		mMatrix = mat4.rotate(mMatrix,degToRad(45),[0,0,1]);
		drawTriangle(color,mMatrix);
		mMatrix = popMatrix(matrixStack);
}

function drawWaves(){
	color = [1,1,1,1];
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.scale(mMatrix, [0.1,0.005,0]);

	// wave 1
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[-8,-40+5*Math.cos(degToRad(-90+waveDisp)),0]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	// wave 2
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[-5,-40+5*Math.cos(degToRad(waveDisp)),0]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	// wave 3
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[-2,-40+5*Math.cos(degToRad(90+waveDisp)),0]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	//wave 4
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[1,-40+5*Math.cos(degToRad(180+waveDisp)),0]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	//wave 5
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[4,-40+5*Math.cos(degToRad(270+waveDisp)),0]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	// wave 6
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[7,-44+5*Math.cos(degToRad(waveDisp)),0]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	// wave 7
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[10,-44+5*Math.cos(degToRad(90+waveDisp)),0]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	mMatrix = popMatrix(matrixStack);
}

function drawRiver(){
	// water
	color = [0,0.3,0.7,1.0];
	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[0,-0.2,0]);
	mMatrix = mat4.scale(mMatrix,[6,0.2,0]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
}

function drawBGTrees(){
	// trunks
	
	color =[162/255 *0.75, 82/255*0.75, 45/255*0.75, 1];

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.scale(mMatrix,[0.05,0.4,0]);
	// trunck 1
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[5,0.35,0]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	// trunck 2
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[10,0.28,0]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	// trunck 3
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[16,0.35,0]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	mMatrix = popMatrix(matrixStack);

	// bottom leaves

	color = [144/255*0.6,238/255*0.6,144/255*0.6,1.0];

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.scale(mMatrix,[0.4,0.3,0]);
	// leaf 1
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.62,1.2,0]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	// leaf 2
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[1.25,1,0]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	// leaf 3
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[2.0,1.2,0]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	mMatrix = popMatrix(matrixStack);

	// middle leaves

	color = [144/255*0.75,238/255*0.75,144/255*0.75,1.0];

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.scale(mMatrix,[0.4,0.3,0]);
	// leaf 1
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.62,1.4,0]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	// leaf 2
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[1.25,1.2,0]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	// leaf 3
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[2.0,1.4,0]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	mMatrix = popMatrix(matrixStack);

	// top leaves

	color = [144/255*0.9,238/255*0.9,144/255*0.9,1.0];

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.scale(mMatrix,[0.4,0.3,0]);
	// leaf 1
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.62,1.6,0]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	// leaf 2
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[1.25,1.4,0]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	// leaf 3
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[2.0,1.6,0]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	mMatrix = popMatrix(matrixStack);



}

function drawBoat(){

	// boat body
	color = [1,1,1,1];
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0,-0.21,0]);
	mMatrix = mat4.scale(mMatrix,[0.22,0.12,0]);
	drawTrap(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	
	// boat mast
	color = [0,0,0,1]
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.scale(mMatrix,[0.02,0.25,0]);
	mMatrix = mat4.translate(mMatrix,[0,-0.15,0]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	// boat sail rope

	color = [0,0,0,1]
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.08,-0.04,0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(-30),[0,0,1])
	mMatrix = mat4.scale(mMatrix,[0.005,0.28,0]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	// boat sail 

	color = [1,0,0,1]
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.11,-0.04,0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(90),[0,0,1])
	mMatrix = mat4.scale(mMatrix,[0.2,-0.2,0]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

}

function drawPillars(){

	color =[162/255 *0.2, 82/255*0.2, 45/255*0.2, 1];

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.38,-0.25,0]);
	mMatrix = mat4.scale(mMatrix,[0.04,0.6,0]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.6,-0.25,0]);
	mMatrix = mat4.scale(mMatrix,[0.04,0.6,0]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
}

function drawBlades(){
	color =[0.75, 0.75, 0, 1];

	var r = 0.15;
	// left windmill

	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.38+r*Math.sin(degToRad(-degreeWindmill)),0.05+r*Math.cos(degToRad(-degreeWindmill)),0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(degreeWindmill),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[0.06,-0.3,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.38+r*Math.sin(degToRad(180-degreeWindmill)),0.05+r*Math.cos(degToRad(180-degreeWindmill)),0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(degreeWindmill),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[0.06,0.3,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.38+r*Math.sin(degToRad(90-degreeWindmill)),0.05+r*Math.cos(degToRad(90-degreeWindmill)),0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(90+degreeWindmill),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[0.06,0.3,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.38+r*Math.sin(degToRad(270-degreeWindmill)),0.05+r*Math.cos(degToRad(270-degreeWindmill)),0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(90+degreeWindmill),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[0.06,-0.3,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	// right windmill

	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.6+r*Math.sin(degToRad(-degreeWindmill)),0.05+r*Math.cos(degToRad(-degreeWindmill)),0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(degreeWindmill),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[0.06,-0.3,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.6+r*Math.sin(degToRad(180-degreeWindmill)),0.05+r*Math.cos(degToRad(180-degreeWindmill)),0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(degreeWindmill),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[0.06,0.3,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.6+r*Math.sin(degToRad(90-degreeWindmill)),0.05+r*Math.cos(degToRad(90-degreeWindmill)),0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(90+degreeWindmill),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[0.06,0.3,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.6+r*Math.sin(degToRad(270-degreeWindmill)),0.05+r*Math.cos(degToRad(270-degreeWindmill)),0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(90+degreeWindmill),[0,0,1]);
	mMatrix = mat4.scale(mMatrix,[0.06,-0.3,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	// draw motors

	color = [0,0,0,1];
	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.38,0.05,0]);
	mMatrix = mat4.scale(mMatrix,[0.3,0.3,1]);
	drawCircle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.6,0.05,0]);
	mMatrix = mat4.scale(mMatrix,[0.3,0.3,1]);
	drawCircle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	
}

function drawBush(){
	//forest green darker
	color=[34/255,139/255,34/255,1];

	// right bush 
	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.16,0,0]);
	mMatrix = mat4.scale(mMatrix,[0.8,0.5,1]);
	drawCircle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	// lightest green 
	color=[34/255*1.8,139/255*1.8,34/255*1.8,1];

	// left bush 
	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.15,0,0]);
	mMatrix = mat4.scale(mMatrix,[1.5,0.9,1]);
	drawCircle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	// lighter green
	color=[34/255*1.5,139/255*1.5,34/255*1.5,1];

	// middle bush bottom screen
	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[0,0,0]);
	mMatrix = mat4.scale(mMatrix,[1.5,0.9,1]);
	drawCircle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
}

function drawBushes(){

	// right house
	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.13,-0.6,0]);
	mMatrix = mat4.scale(mMatrix,[0.9,0.9,1]);
	drawBush();
	mMatrix = popMatrix(matrixStack);

	// left house
	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[-1,-0.6,0]);
	drawBush();
	mMatrix = popMatrix(matrixStack);

	// bottom screen
	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.1,-1,0]);
	mMatrix = mat4.scale(mMatrix,[0.9,0.9,1]);
	drawBush();
	mMatrix = popMatrix(matrixStack);

	// right road
	pushMatrix(matrixStack, mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.9,-0.5,0]);
	mMatrix = mat4.scale(mMatrix,[0.9,0.9,1]);
	drawBush();
	mMatrix = popMatrix(matrixStack);

}

function drawHouse(){
	
	// building
	color =[1,1,1,1];

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.55,-0.55,0]);
	mMatrix = mat4.scale(mMatrix,[0.5,0.3,1]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
	
	
	// roof
	color = [1,0,0,1];

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.55,-0.35,0]);
	mMatrix = mat4.scale(mMatrix,[0.4,-0.25,1]);
	drawTrap(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	// door
	color = [0.75,0.75,0,1];
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.55,-0.6,0]);
	mMatrix = mat4.scale(mMatrix,[0.1,0.2,1]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	// window left
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.4,-0.55,0]);
	mMatrix = mat4.scale(mMatrix,[0.08,0.08,1]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	//window right
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.7,-0.55,0]);
	mMatrix = mat4.scale(mMatrix,[0.08,0.08,1]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

}

function drawCar(){

	// outer wheels
	color = [0,0,0,1];
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.15,-0.1,0]);
	mMatrix = mat4.scale(mMatrix,[0.5,0.5,1]);
	drawCircle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.15,-0.1,0]);
	mMatrix = mat4.scale(mMatrix,[0.5,0.5,1]);
	drawCircle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	// wheel rim
	color = [0.4,0.4,0.4,1];
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.15,-0.1,0]);
	mMatrix = mat4.scale(mMatrix,[0.4,0.4,1]);
	drawCircle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.15,-0.1,0]);
	mMatrix = mat4.scale(mMatrix,[0.4,0.4,1]);
	drawCircle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	// car body 
	color = [30/255,144/255,255/255,1];
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0,-0.05,0]);
	mMatrix = mat4.scale(mMatrix,[0.45,0.1,1]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[-0.225,-0.05,0]);
	mMatrix = mat4.scale(mMatrix,[0.1,0.1,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.225,-0.05,0]);
	mMatrix = mat4.scale(mMatrix,[0.1,0.1,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	// car roof
	color = [0.8,0.2,0.2,1];
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0,0.04,0]);
	mMatrix = mat4.scale(mMatrix,[0.25,-0.12,1]);
	drawTrap(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

}

function drawBird(){
	color = [0,0,0,1];

	// body 
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0,-0.01,0]);
	mMatrix = mat4.scale(mMatrix,[0.02,0.02,1]);
	drawSquare(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	// left wing
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.rotate(mMatrix,degToRad(birdDisp),[0,0,1]);
	mMatrix = mat4.translate(mMatrix,[-0.04,0,0]);
	mMatrix = mat4.scale(mMatrix,[0.1,0.02,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);

	// right wing
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.rotate(mMatrix,degToRad(-birdDisp),[0,0,1]);
	mMatrix = mat4.translate(mMatrix,[0.04,0,0]);
	mMatrix = mat4.scale(mMatrix,[0.1,0.02,1]);
	drawTriangle(color,mMatrix);
	mMatrix = popMatrix(matrixStack);
}

function drawBirds(){

	// head bird
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.35,0.65,0]);
	mMatrix = mat4.scale(mMatrix,[0.8,0.8,1]);
	drawBird(mMatrix);
	mMatrix = popMatrix(matrixStack);

	// layer 2 bird 1
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.25,0.7,0]);
	mMatrix = mat4.scale(mMatrix,[0.7,0.7,1]);
	drawBird(mMatrix);
	mMatrix = popMatrix(matrixStack);

	// layer 2 bird 2
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.45,0.7,0]);
	mMatrix = mat4.scale(mMatrix,[0.7,0.7,1]);
	drawBird(mMatrix);
	mMatrix = popMatrix(matrixStack);

	// layer 3 bird 1
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.15,0.75,0]);
	mMatrix = mat4.scale(mMatrix,[0.6,0.6,1]);
	drawBird(mMatrix);
	mMatrix = popMatrix(matrixStack);

	// layer 3 bird 2
	pushMatrix(matrixStack,mMatrix);
	mMatrix = mat4.translate(mMatrix,[0.55,0.75,0]);
	mMatrix = mat4.scale(mMatrix,[0.6,0.6,1]);
	drawBird(mMatrix);
	mMatrix = popMatrix(matrixStack);
}

////////////////////////////////////////////////////////////////////////
function drawScene() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

	// stop the current loop of animation
	if (animation) {
		window.cancelAnimationFrame(animation);
	}

	var animate = function () {
		gl.clearColor(112/255, 211/255, 225/255, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		// initialize the model matrix to identity matrix
		mat4.identity(mMatrix);

		// animation variables update

		if (boatDir * boatDisp >= 1 ) {
			boatDir = -1 * boatDir;
		}
		if (cloudDir * cloudDisp >= 1 ) {
			cloudDir = -1 * cloudDir;
		}
		if (birdDir * birdDisp >= 20 ) {
			birdDir = -1 * birdDir;
		}
		if (bushDir * bushValue >= 20 + Math.floor(Math.random() * 80) ) {
			if (bushDir==1)
				bushDir = -3;
			else
				bushDir = 1;
		}

		bushValue=(bushValue+3*bushDir);
		birdDisp += birdDir*1;
		cloudDisp += cloudDir*0.001;
		boatDisp += boatDir*0.001;
		degreeSun += 0.1;
		degreeWindmill += 0.2;
		waveDisp= (waveDisp+1)%360;


		///////////////////////
		// MOUNTAINS
		///////////////////////

		drawMountains(mMatrix);

		////////////////////////
		// SUN
		////////////////////////

		pushMatrix(matrixStack, mMatrix);
		mMatrix = mat4.translate(mMatrix, [-0.65, 0.65, 0.0]);
		mMatrix = mat4.rotate(mMatrix, degToRad(degreeSun), [0.0, 0.0, 1.0]);
		mMatrix = mat4.translate(mMatrix, [0.65, -0.65, 0.0]);
		// pushMatrix(matrixStack, mMatrix);
		mMatrix = mat4.translate(mMatrix, [-0.65, 0.65, 0.0]);
		drawSun(mMatrix);
		// mMatrix = popMatrix(matrixStack);
		mMatrix = popMatrix(matrixStack);

		/////////////////////////
		// CLOUDS
		/////////////////////////

		pushMatrix(matrixStack,mMatrix);
		mMatrix = mat4.translate(mMatrix,[cloudDisp+0.5,0,0]);
		drawClouds();
		mMatrix = popMatrix(matrixStack);

		///////////////////////
		// Ground
		///////////////////////

		drawGround();

		//////////////////
		// River
		//////////////////

		drawRiver();
		drawWaves();

		//////////////////
		// BG Trees
		//////////////////

		drawBGTrees();

		//////////////////
		// Birds
		//////////////////

		drawBirds();

		//////////////////
		// Boat
		//////////////////

		pushMatrix(matrixStack,mMatrix);
		if (boatDir==1){
			mMatrix = mat4.translate(mMatrix,[boatDisp,0.07+0.05*Math.sin(degToRad(180+1280*boatDisp)),0]);
			mMatrix = mat4.rotate(mMatrix,Math.sin(degToRad(-90+1280*boatDisp*boatDir))/5,[0,0,1]);
		}
		else{
			mMatrix = mat4.translate(mMatrix,[boatDisp,0.07+0.05*Math.sin(degToRad(180+1280*boatDisp*-1)),0]);
			mMatrix = mat4.rotate(mMatrix,Math.sin(degToRad(140+1280*boatDisp))/5,[0,0,1]);
		}
		drawBoat();
		mMatrix = popMatrix(matrixStack);

		//////////////////
		// Windmills
		//////////////////

		drawPillars();
		pushMatrix(matrixStack,mMatrix);
		mMatrix = mat4.rotate(mMatrix,degToRad(0),[0,0,1]);
		drawBlades();
		mMatrix = popMatrix(matrixStack);

		//////////////////
		// Bushes
		//////////////////

		pushMatrix(matrixStack,mMatrix);
		mMatrix = mat4.rotate(mMatrix,degToRad(30),[0,0,1]);
		mMatrix = mat4.scale(mMatrix,[1,1+(bushValue+50)/5000,1]);
		mMatrix = mat4.rotate(mMatrix,degToRad(-30),[0,0,1]);
		drawBushes();
		mMatrix = popMatrix(matrixStack);

		//////////////////
		// House
		//////////////////

		drawHouse();

		//////////////////
		// Car
		//////////////////

		pushMatrix(matrixStack,mMatrix);
		mMatrix = mat4.translate(mMatrix,[-0.67,-0.8,0]);
		drawCar();
		mMatrix = popMatrix(matrixStack);



		animation = window.requestAnimationFrame(animate);
	};

	animate();
}

// This is the entry point from the html
function webGLStart() {
	var canvas = document.getElementById("assignmentAnimation2D");
	initGL(canvas);
	shaderProgram = initShaders();

	//get locations of attributes declared in the vertex shader
	const aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");

	uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");

	//enable the attribute arrays
	gl.enableVertexAttribArray(aPositionLocation);

	uColorLoc = gl.getUniformLocation(shaderProgram, "color");

	initCircleBuffer();
	initSquareBuffer();
	initTriangleBuffer();
	displayState = gl.POINTS;
	drawScene();
}
