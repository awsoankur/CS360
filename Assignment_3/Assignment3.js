////////////////////////////////////////////////////////////////////////
// A WebGL program to show texture mapping on a sphere..

var gl;
var canvas;
var matrixStack = [];

var animation;

var cameraAngle = 0.0; 

var zAngle = 0.0;
var yAngle = 0.0;
var prevMouseX = 0.0;
var prevMouseY = 0.0;
var aPositionLocation;
var aNormalLocation;
var aTexCoordLocation;
var uVMatrixLocation;
var uMMatrixLocation;
var uPMatrixLocation;
var uEyeLocation;
var uColorLocation;
var uCubeMapLocation;
var uOriginalTexLocation;
var uReflectTexLocaion;
var uColorTexLocaion;

var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix

var spBuf;
var spIndexBuf;
var spNormalBuf;
var spTexBuf;


var sqBuf;
var sqNormalBuf;
var sqIndexBuf;
var sqTexBuf;
var squareNormalBuf;
var sqVertexIndexBuffer;
var sqVertexPositionBuffer;
var squareTexBuf;

var spVerts = [];
var spIndicies = [];
var spNormals = [];
var spTexCoords = [];

var squareTexCoords = [];

var uTextureLocation;
var sampleTexture;
var rcubeTexture;
var nxTexture;
var pxTexture;
var nyTexture;
var pyTexture;
var nzTexture;
var pzTexture;
var woodTexture;

var cubemapTexture;

var textureFile = "earthmap2.jpg";
// cube map files
var negx = "texture_and_other_files/Nvidia_cubemap/negx.jpg"
var posx = "texture_and_other_files/Nvidia_cubemap/posx.jpg"
var negy = "texture_and_other_files/Nvidia_cubemap/negy.jpg"
var posy = "texture_and_other_files/Nvidia_cubemap/posy.jpg"
var negz = "texture_and_other_files/Nvidia_cubemap/negz.jpg"
var posz = "texture_and_other_files/Nvidia_cubemap/posz.jpg"

// other textures
var rcube = "texture_and_other_files/rcube.png"
var wood = "texture_and_other_files/wood_texture.jpg"


var eyePos = [0.0, 0.0, 3.0]; // camera/eye position
var xCam = 0;
var yCam = 0;
var zCam = 0;

//////////////////////////////////////////////////////////////////////////
const vertexShaderCode = `#version 300 es
in vec3 aPosition;
in vec3 aNormal;
in vec2 aTexCoords;

uniform mat4 uMMatrix;
uniform mat4 uPMatrix;
uniform mat4 uVMatrix;

out vec3 v_worldPosition;
out vec3 v_worldNormal;
out vec2 fragTexCoord;

void main() {
  	mat4 projectionModelView;
	projectionModelView=uPMatrix*uVMatrix*uMMatrix;

	mat4 wnMatrix = transpose(inverse(uMMatrix));

  	// pass texture coordinate to frag shader
  	fragTexCoord = aTexCoords;

	v_worldPosition = mat3(uMMatrix)*aPosition;
	v_worldNormal = mat3(wnMatrix)*aNormal;

	// calculate clip space position
	gl_Position =  projectionModelView * vec4(aPosition,1.0);
}`;

const fragShaderCode = `#version 300 es
precision highp float;

out vec4 fragColor;
in vec2 fragTexCoord;
in vec3 v_worldPosition;
in vec3 v_worldNormal;
uniform sampler2D imageTexture;
uniform samplerCube cubemap;
uniform vec3 eyePos;
uniform vec4 color;
uniform float Io;
uniform float Ir;
uniform float It;

void main() {
  	vec3 worldNormal = normalize(v_worldNormal);
  	vec3 eyeToSurfaceDir = normalize(v_worldPosition - eyePos);
	vec3 directionReflection = reflect(eyeToSurfaceDir,worldNormal);
	vec4 cubeMapReflectCol = texture(cubemap, directionReflection);

  	//look up texture color
	vec4 textureColor =  texture(imageTexture, fragTexCoord); 

  	fragColor = (Io*color+ Ir*cubeMapReflectCol+It*textureColor)/(Io+Ir+It);
  	fragColor.a = 1.0;
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

	// check for compiiion and linking status
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

function degToRad(degrees) {
	return (degrees * Math.PI) / 180;
}

function initSquareBuffer() {
	// buffer for point locations
	const sqVertices = new Float32Array([
	  0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5,
	]);
	sqBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sqBuf);
	gl.bufferData(gl.ARRAY_BUFFER, sqVertices, gl.STATIC_DRAW);
	sqBuf.itemSize = 2;
	sqBuf.numItems = 4;
  
	// buffer for point indices
	const sqIndices = new Uint16Array([0, 1, 2, 0, 2, 3]);
	sqIndexBuf = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqIndexBuf);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, sqIndices, gl.STATIC_DRAW);
	sqIndexBuf.itemsize = 1;
	sqIndexBuf.numItems = 6;
  
	// buffer for normals
	const sqNormals = new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1])
	sqNormalBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sqNormalBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sqNormals), gl.STATIC_DRAW);
	sqNormalBuf.itemSize = 3;
	sqNormalBuf.numItems = sqNormals.length / 3;
  
	// buffer for texture coordinates
	const sqTexCoords = new Uint16Array([1, 1, 0, 1, 0, 0, 1, 0]);
	sqTexBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sqTexBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sqTexCoords), gl.STATIC_DRAW);
	sqTexBuf.itemSize = 2;
	sqTexBuf.numItems = sqTexCoords.length / 2;
  
}

function drawSquare(color,texture) {
	// buffer for point locations
	gl.bindBuffer(gl.ARRAY_BUFFER, sqBuf);
	gl.vertexAttribPointer(
	  aPositionLocation,
	  sqBuf.itemSize,
	  gl.FLOAT,
	  false,
	  0,
	  0
	);
  
	gl.bindBuffer(gl.ARRAY_BUFFER, sqTexBuf);
	gl.vertexAttribPointer(
	  aTexCoordLocation,
	  sqTexBuf.itemSize,
	  gl.FLOAT,
	  false,
	  0,
	  0
	);
  
	gl.bindBuffer(gl.ARRAY_BUFFER, sqNormalBuf);
	gl.vertexAttribPointer(
	  aNormalLocation,
	  sqNormalBuf.itemSize,
	  gl.FLOAT,
	  false,
	  0,
	  0
	);

	// buffer for point indices
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sqIndexBuf);

	gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
	gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
	gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
	gl.uniform4fv(uColorLocation,color);
	gl.uniform3fv(uEyeLocation,eyePos);
	gl.uniform1f(uOriginalTexLocation,0.0);
	gl.uniform1f(uReflectTexLocaion,0.0);
	gl.uniform1f(uColorTexLocaion,1.0);

	gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
	gl.bindTexture(gl.TEXTURE_2D, texture); // bind the texture object 
	gl.uniform1i(uTextureLocation, 1); // pass the texture unit

	// now draw the square
	gl.drawElements(
		gl.TRIANGLES,
		sqIndexBuf.numItems,
		gl.UNSIGNED_SHORT,
		0
	);
}
// New sphere initialization function
function initSphere(nslices, nstacks, radius) {
	for (var i = 0; i <= nslices; i++) {
		var angle = (i * Math.PI) / nslices;
		var comp1 = Math.sin(angle);
		var comp2 = Math.cos(angle);

		for (var j = 0; j <= nstacks; j++) {
			var phi = (j * 2 * Math.PI) / nstacks;
			var comp3 = Math.sin(phi);
			var comp4 = Math.cos(phi);

			var xcood = comp4 * comp1;
			var ycoord = comp2;
			var zcoord = comp3 * comp1;
			var utex = 1 - j / nstacks;
			var vtex = 1 - i / nslices;

			spVerts.push(radius * xcood, radius * ycoord, radius * zcoord);
			spNormals.push(xcood, ycoord, zcoord);
			spTexCoords.push(utex, vtex);
		}
	}

	// now compute the indices here
	for (var i = 0; i < nslices; i++) {
		for (var j = 0; j < nstacks; j++) {
			var id1 = i * (nstacks + 1) + j;
			var id2 = id1 + nstacks + 1;

			spIndicies.push(id1, id2, id1 + 1);
			spIndicies.push(id2, id2 + 1, id1 + 1);
		}
	}
}

function initSphereBuffer() {
	var nslices = 50;
	var nstacks = 50;
	var radius = 1.0;

	initSphere(nslices, nstacks, radius);

	// buffer for vertices
	spBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spVerts), gl.STATIC_DRAW);
	spBuf.itemSize = 3;
	spBuf.numItems = spVerts.length / 3;

	// buffer for indices
	spIndexBuf = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);
	gl.bufferData(
		gl.ELEMENT_ARRAY_BUFFER,
		new Uint32Array(spIndicies),
		gl.STATIC_DRAW
	);
	spIndexBuf.itemsize = 1;
	spIndexBuf.numItems = spIndicies.length;

	// buffer for normals
	spNormalBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spNormals), gl.STATIC_DRAW);
	spNormalBuf.itemSize = 3;
	spNormalBuf.numItems = spNormals.length / 3;

	// buffer for texture coordinates
	spTexBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spTexCoords), gl.STATIC_DRAW);
	spTexBuf.itemSize = 2;
	spTexBuf.numItems = spTexCoords.length / 2;
}

function drawSphere(color, texture,Io,It,Ir) {
	gl.bindBuffer(gl.ARRAY_BUFFER, spBuf);
	gl.vertexAttribPointer(
		aPositionLocation,
		spBuf.itemSize,
		gl.FLOAT,
		false,
		0,
		0
	);

	gl.bindBuffer(gl.ARRAY_BUFFER, spTexBuf);
	gl.vertexAttribPointer(
		aTexCoordLocation,
		spTexBuf.itemSize,
		gl.FLOAT,
		false,
		0,
		0
	);

	gl.bindBuffer(gl.ARRAY_BUFFER, spNormalBuf);
	gl.vertexAttribPointer(
		aNormalLocation,
		spNormalBuf.itemSize,
		gl.FLOAT,
		false,
		0,
		0
	);

	// Draw elementary arrays - triangle indices
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, spIndexBuf);

	gl.uniformMatrix4fv(uMMatrixLocation, false, mMatrix);
	gl.uniformMatrix4fv(uVMatrixLocation, false, vMatrix);
	gl.uniformMatrix4fv(uPMatrixLocation, false, pMatrix);
	gl.uniform4fv(uColorLocation,color);
	gl.uniform3fv(uEyeLocation,eyePos);
	gl.uniform1f(uOriginalTexLocation,Io);
	gl.uniform1f(uReflectTexLocaion,Ir);
	gl.uniform1f(uColorTexLocaion,It);

	// for texture binding
	gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
	gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubemapTexture); // bind the texture object to the texture unit
	gl.uniform1i(uCubeMapLocation, 0); // pass the texture unit to the shader

	gl.activeTexture(gl.TEXTURE1); // set texture unit 0 to use
	gl.bindTexture(gl.TEXTURE_2D, texture); // bind the texture object to the texture unit
	gl.uniform1i(uTextureLocation, 1);

	gl.drawElements(gl.TRIANGLES, spIndexBuf.numItems, gl.UNSIGNED_INT, 0);
}

function initCubeMap() {
	const faceinfo = [
		{
			target : gl.TEXTURE_CUBE_MAP_POSITIVE_X,
			url : posx,
		},
		{
			target : gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
			url : negx,
		},
		{
			target : gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
			url : posy,
		},
		{
			target : gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
			url : negy,
		},
		{
			target : gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
			url : posz,
		},
		{
			target : gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
			url : negz,
		},
	];
	cubemapTexture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_CUBE_MAP,cubemapTexture);

	faceinfo.forEach((faceinfo)=>{
		const {target,url} = faceinfo;
		// setup each face
		gl.texImage2D(
			target,
			0,
			gl.RGBA,
			512,
			512,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			null
		);

		const image = new Image();
		image.src = url;
		image.addEventListener("load",function() {
			gl.bindTexture(gl.TEXTURE_CUBE_MAP,cubemapTexture);
			gl.texImage2D(target,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,image);
			gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
			drawScene();
		});
	});
	// gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
	gl.texParameteri(
		gl.TEXTURE_CUBE_MAP,
		gl.TEXTURE_MIN_FILTER,
		gl.TEXTURE_MIPMAP_LINEAR
	);
}

function initTextures(textureFile) {
	var tex = gl.createTexture();
	tex.image = new Image();
	tex.image.src = textureFile;
	tex.image.onload = function () {
		handleTextureLoaded(tex);
	};
	return tex;
}

function handleTextureLoaded(texture) {
	gl.bindTexture(gl.TEXTURE_2D, texture);
	// gl.pixelStorei(gl.UNPACK	_FLIP_Y_WEBGL, 1); // use it to flip Y if needed
	gl.texImage2D(
		gl.TEXTURE_2D, // 2D texture
		0, // mipmap level
		gl.RGB, // internal format
		gl.RGB, // format
		gl.UNSIGNED_BYTE, // type of data
		texture.image // array or <img>
	);

	gl.generateMipmap(gl.TEXTURE_2D);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(
		gl.TEXTURE_2D,
		gl.TEXTURE_MIN_FILTER,
		gl.LINEAR_MIPMAP_LINEAR
	);

	drawScene();
}

function drawSkyBox() {
	// Back side of the cube
	pushMatrix(matrixStack, mMatrix);

	// texture setup for use

	// transformations
	mMatrix = mat4.translate(mMatrix, [0, 0, -99.5]);
	mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
	mMatrix = mat4.scale(mMatrix, [200, 200, 200]);

	color = [0.0, 1.0, 1.0, 1.0];
	drawSquare(color,nzTexture);

	mMatrix = popMatrix(matrixStack);

	// Front side of the cube
	pushMatrix(matrixStack, mMatrix);

	// transformations
	mMatrix = mat4.translate(mMatrix, [0, 0, 99.5]);
	mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
	mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 1, 0]);
	mMatrix = mat4.scale(mMatrix, [200, 200, 200]);

	color = [0.0, 1.0, 1.0, 1.0];
	drawSquare(color,pzTexture);

	mMatrix = popMatrix(matrixStack);

	// side left face

	pushMatrix(matrixStack, mMatrix);

	// transformations
	mMatrix = mat4.translate(mMatrix, [-99.5, 0, 0]);
	mMatrix = mat4.rotate(mMatrix, degToRad(90), [0, 1, 0]);
	mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
	mMatrix = mat4.scale(mMatrix, [200, 200, 200]);

	color = [0.0, 1.0, 1.0, 1.0];
	drawSquare(color,nxTexture);

	mMatrix = popMatrix(matrixStack);

	// side right face

	pushMatrix(matrixStack, mMatrix);

	// transformations
	mMatrix = mat4.translate(mMatrix, [99.5, 0, 0]);
	mMatrix = mat4.rotate(mMatrix, degToRad(-90), [0, 1, 0]);
	mMatrix = mat4.rotate(mMatrix, degToRad(180), [0, 0, 1]);
	mMatrix = mat4.scale(mMatrix, [200, 200, 200]);

	color = [0.0, 1.0, 1.0, 1.0];
	drawSquare(color,pxTexture);

	mMatrix = popMatrix(matrixStack);

	// botttom face

	pushMatrix(matrixStack, mMatrix);

	// transformations
	mMatrix = mat4.translate(mMatrix, [0, -99.5, 0]);
	mMatrix = mat4.rotate(mMatrix, degToRad(-90), [1, 0, 0]);
	mMatrix = mat4.scale(mMatrix, [200, 200, 200]);

	color = [0.0, 1.0, 1.0, 1.0];
	drawSquare(color,nyTexture);

	mMatrix = popMatrix(matrixStack);

	// front face

	pushMatrix(matrixStack, mMatrix);

	// transformations
	mMatrix = mat4.translate(mMatrix, [0, 99.5, 0]);
	mMatrix = mat4.rotate(mMatrix, degToRad(90), [1, 0, 0]);
	
	mMatrix = mat4.scale(mMatrix, [200, 200, 200]);

	color = [0.0, 1.0, 1.0, 1.0];
	drawSquare(color,pyTexture);

	mMatrix = popMatrix(matrixStack);

}

function drawScene() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

	// stop the current loop of animation
	if (animation) {
		window.cancelAnimationFrame(animation);
	}

	var animate = function () {

		cameraAngle -= 0.01;

		eyePos[0] = 3*Math.sin(cameraAngle);
		eyePos[2] = 3*Math.cos(cameraAngle);

		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.DEPTH_TEST);


		//set up the model matrix
		mat4.identity(mMatrix);

		// set up the view matrix, multiply into the modelview matrix
		mat4.identity(vMatrix);
		vMatrix = mat4.lookAt(eyePos, [xCam, yCam, zCam], [0, 1, 0], vMatrix);

		//set up projection matrix
		mat4.identity(pMatrix);
		mat4.perspective(60, 1.0, 0.01, 1000, pMatrix);

		// global rotation, controlled by mouse
		mMatrix = mat4.rotate(mMatrix, degToRad(zAngle), [0, 1, 0]);
		mMatrix = mat4.rotate(mMatrix, degToRad(yAngle), [1, 0, 0]);

		// draw the texture mapped sphere
		pushMatrix(matrixStack, mMatrix);
		color = [1.0, 1.0, 0.0, 1.0];
		mMatrix = mat4.scale(mMatrix, [1.2, 1.2, 1.2]);
		drawSphere(color, sampleTexture, 0.0, 0.0, 1.0);
		mMatrix = popMatrix(matrixStack);
		 
		drawSkyBox();
		animation = window.requestAnimationFrame(animate);
	};

	animate();
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
		var mouseX = event.clientX;
		var diffX = mouseX - prevMouseX;
		zAngle = zAngle + diffX / 5;
		prevMouseX = mouseX;

		var mouseY = canvas.height - event.clientY;
		var diffY = mouseY - prevMouseY;
		yAngle = yAngle - diffY / 5;
		prevMouseY = mouseY;

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
	canvas = document.getElementById("3DTextureMapExample");
	document.addEventListener("mousedown", onMouseDown, false);

	initGL(canvas);
	shaderProgram = initShaders();

	//get locations of attributes declared in the vertex shader
	aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
	aNormalLocation = gl.getAttribLocation(shaderProgram,"aNormal");
	aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");

	uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
	uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
	uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
	uEyeLocation = gl.getUniformLocation(shaderProgram,"eyePos");
	uColorLocation = gl.getUniformLocation(shaderProgram,"color");
	uOriginalTexLocation = gl.getUniformLocation(shaderProgram,"Io");
	uReflectTexLocaion = gl.getUniformLocation(shaderProgram,"Ir");
	uColorTexLocaion = gl.getUniformLocation(shaderProgram,"It");

	//texture location in shader
	uTextureLocation = gl.getUniformLocation(shaderProgram, "imageTexture");
	uCubeMapLocation = gl.getUniformLocation(shaderProgram,"cubemap");

	//enable the attribute arrays
	gl.enableVertexAttribArray(aPositionLocation);
	gl.enableVertexAttribArray(aTexCoordLocation);
	gl.enableVertexAttribArray(aNormalLocation);

	//initialize buffers for the square
	initSphereBuffer();
	initSquareBuffer()
	initCubeMap();
	sampleTexture = initTextures(textureFile);
	rcubeTexture = initTextures(rcube);
	woodTexture = initTextures(wood);
	pxTexture = initTextures(posx);
	pyTexture = initTextures(posy);
	pzTexture = initTextures(posz);
	nxTexture = initTextures(negx);
	nyTexture = initTextures(negy);
	nzTexture = initTextures(negz);

	drawScene();
}
