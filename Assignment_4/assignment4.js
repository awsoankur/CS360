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
var uIsGreyLocation;
var uIsSepiaLocation;
var uBrightnessLocation;
var uConstrastLocation;
var uIsSmoothLocation;
var uIsSharpLocation;
var uIsGradientLocation;
var uIsLaplacianLocation;
var uIsBgOnlyLocation;

var uBgTextureLocation;
var uFgTextureLocation;

var vMatrix = mat4.create(); // view matrix
var mMatrix = mat4.create(); // model matrix
var pMatrix = mat4.create(); //projection matrix

var spBuf;
var spIndexBuf;
var spNormalBuf;
var spTexBuf;

var cubeIndexBuf;
var cubeNormalBuf;
var cubeVertexBuf;
var cubeTexBuf;

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

var cubemapTexture;

var textureFile = "earthmap2.jpg";

// bg and fg images
var bgImage;
var fgImage;

// Image mode
var isBgOnly=2;
var isGreyscale=0;
var isSepia=0;


//Image properties
var brightnessValue = 100; // Default value
var contrastValue = 100;   // Default value
var isSmooth =0;
var isSharp=0;
var isGradient=0;
var isLaplacian=0;

// Inpur JSON model file to load
input_JSON = "texture_and_other_files/teapot.json";

var eyePos = [0.0, 0.0, 0.0]; // camera/eye position
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
out vec3 posInEyeSpace;
out vec3 anorm;

void main() {
  	mat4 projectionModelView;
	projectionModelView=uPMatrix*uVMatrix*uMMatrix;

	mat4 wnMatrix = transpose(inverse(uMMatrix));

  	// pass texture coordinate to frag shader
  	fragTexCoord = aTexCoords;

	v_worldPosition = mat3(uMMatrix)*aPosition;
	v_worldNormal = mat3(wnMatrix)*aNormal;
	posInEyeSpace = (uVMatrix*uMMatrix*vec4(aPosition,1.0)).xyz;
	anorm = aNormal;

	// calculate clip space position
	gl_Position =  projectionModelView * vec4(aPosition,1.0);

}`;

const fragShaderCode = `#version 300 es
precision highp float;

in vec3 anorm;
in vec2 fragTexCoord;
in vec3 v_worldPosition;
in vec3 v_worldNormal;
in vec3 posInEyeSpace;
uniform mat4 uVMatrix;
uniform mat4 uMMatrix;
uniform sampler2D bgimageTexture;
uniform sampler2D fgimageTexture;
uniform int isGreyscale;
uniform int isSepia;
uniform float bright;
uniform float contrast;
uniform int isSmooth;
uniform int isSharp;
uniform int isGrad;
uniform int isLaplace;
uniform int isbgonly;

out vec4 fragColor;

void main() {

  	//look up texture color
	vec4 bgtextureColor =  texture(bgimageTexture, fragTexCoord); 
	vec4 fgtextureColor = texture(fgimageTexture, fragTexCoord);
	vec4 textureColor;
	float alpha;

	if (isSmooth==1)
	{
		vec4 finalColor = vec4(0.0,0.0,0.0,0.0);
		for(float i=-1.0 ;i<=1.0;i+=1.0)
		{
			for(float j=-1.0;j<=1.0;j+=1.0)
			{
				vec2 newTexCoord = fragTexCoord + vec2(i/800.0,j/800.0);
				finalColor = finalColor + texture(bgimageTexture,newTexCoord);
			}
		}
		bgtextureColor = finalColor/9.0;
	}
	else if (isSharp==1)
	{
		vec4 finalColor = vec4(0.0,0.0,0.0,0.0);
		for(float i=-1.0 ;i<=1.0;i+=1.0)
		{
			for(float j=-1.0;j<=1.0;j+=1.0)
			{
				float param=1.0;
				if (i*j==1.0 || i*j==-1.0)
					param = 0.0;
				else if (i==0.0 && j==0.0)
					param = 5.0;
				else
					param = -1.0;
				vec2 newTexCoord = fragTexCoord + vec2(i/800.0,j/800.0);
				finalColor = finalColor + param*texture(bgimageTexture,newTexCoord);
			}
		}
		bgtextureColor = finalColor;
	}
	else if (isGrad==1)
	{
		vec4 up = texture(bgimageTexture,fragTexCoord+vec2(0,-1.0/800.0));
		vec4 down = texture(bgimageTexture,fragTexCoord+vec2(0,1.0/800.0));
		vec4 right = texture(bgimageTexture,fragTexCoord+vec2(1.0/800.0,0));
		vec4 left = texture(bgimageTexture,fragTexCoord+vec2(-1.0/800.0,0));
		vec4 dy = (up-down)*0.5;
		vec4 dx = (right-left)*0.5;
		vec4 gradient = sqrt(dx*dx+dy*dy);
		bgtextureColor = gradient;
	}
	if (isLaplace==1)
	{
		vec4 finalColor = vec4(0.0,0.0,0.0,0.0);
		for(float i=-1.0 ;i<=1.0;i+=1.0)
		{
			for(float j=-1.0;j<=1.0;j+=1.0)
			{
				float param=1.0;
				if (i*j==1.0 || i*j==-1.0)
					param = 0.0;
				else if (i==0.0 && j==0.0)
					param = 4.0;
				else
					param = -1.0;
				vec2 newTexCoord = fragTexCoord + vec2(i/800.0,j/800.0);
				finalColor = finalColor + param*texture(bgimageTexture,newTexCoord);
			}
		}
		bgtextureColor = finalColor;
	}


	if (isbgonly==0){
		alpha = fgtextureColor.a;
		textureColor = fgtextureColor*alpha + bgtextureColor*(1.0-alpha);
	}
	else if (isbgonly==1)
		textureColor = bgtextureColor;
	else
		textureColor = vec4(0,0,0,1);
	
	fragColor = (bright * textureColor);
	fragColor.rgb = 0.5 + (contrast/100.0) * (fragColor.rgb - 0.5);

	if (isGreyscale==1){
		float gr = dot(fragColor ,vec4(0.2126, 0.7152, 0.0722,0.0));
        fragColor = vec4(gr,gr,gr,1.0);
    }
    if (isSepia==1)
    {
        float sepiaR = 0.393*fragColor.r + 0.769*fragColor.g + 0.189*fragColor.b;
        float sepiaG = 0.349*fragColor.r + 0.686*fragColor.g + 0.168*fragColor.b;
        float sepiaB = 0.272*fragColor.r + 0.534*fragColor.g + 0.131*fragColor.b;
        fragColor = vec4(sepiaR,sepiaG,sepiaB,1.0);
    }
    fragColor.a = textureColor.a;

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
	const sqTexCoords = new Uint16Array([0, 0, 1, 0, 1, 1, 0, 1]);
	sqTexBuf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, sqTexBuf);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sqTexCoords), gl.STATIC_DRAW);
	sqTexBuf.itemSize = 2;
	sqTexBuf.numItems = sqTexCoords.length / 2;
  
}

function drawSquare(color,bgtexture,fgtexture) {
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
	gl.uniform1f(uBrightnessLocation,brightnessValue/100);
    gl.uniform1i(uIsGreyLocation,isGreyscale);
    gl.uniform1i(uIsSepiaLocation,isSepia);
    gl.uniform1f(uConstrastLocation,contrastValue);
    gl.uniform1i(uIsSmoothLocation,isSmooth);
    gl.uniform1i(uIsSharpLocation,isSharp);
    gl.uniform1i(uIsGradientLocation,isGradient);
    gl.uniform1i(uIsLaplacianLocation,isLaplacian);
	gl.uniform1i(uIsBgOnlyLocation,isBgOnly);

	gl.activeTexture(gl.TEXTURE1); // set texture unit 1 to use
	gl.bindTexture(gl.TEXTURE_2D, bgtexture); // bind the texture object 
	gl.uniform1i(uBgTextureLocation, 1); // pass the texture unit

	gl.activeTexture(gl.TEXTURE0); // set texture unit 0 to use
	gl.bindTexture(gl.TEXTURE_2D, fgtexture); // bind the texture object 
	gl.uniform1i(uFgTextureLocation, 0); // pass the texture unit

	// now draw the square
	gl.drawElements(
		gl.TRIANGLES,
		sqIndexBuf.numItems,
		gl.UNSIGNED_SHORT,
		0
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
	// gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // use it to flip Y if needed
	gl.texImage2D(
		gl.TEXTURE_2D, // 2D texture
		0, // mipmap level
		gl.RGBA, // internal format
		gl.RGBA, // format
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

function drawScene() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

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


	pushMatrix(matrixStack, mMatrix);

	// transformations
	mMatrix = mat4.translate(mMatrix, [0, 0, -200.0]);
	mMatrix = mat4.rotate(mMatrix,degToRad(180),[0,1,0]);
	mMatrix = mat4.scale(mMatrix, [235, 235, 1]);

	color = [0.0, 1.0, 1.0, 1.0];
	drawSquare(color,bgImage,fgImage);

	mMatrix = popMatrix(matrixStack);

}

// This is the entry point from the html
function webGLStart() {
	canvas = document.getElementById("canvas");

	initGL(canvas);
	shaderProgram = initShaders();

	//get locations of attributes declared in the vertex shader
	aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");
	aNormalLocation = gl.getAttribLocation(shaderProgram,"aNormal");
	aTexCoordLocation = gl.getAttribLocation(shaderProgram, "aTexCoords");

	uMMatrixLocation = gl.getUniformLocation(shaderProgram, "uMMatrix");
	uPMatrixLocation = gl.getUniformLocation(shaderProgram, "uPMatrix");
	uVMatrixLocation = gl.getUniformLocation(shaderProgram, "uVMatrix");
	uColorLocation = gl.getUniformLocation(shaderProgram,"color");
    uIsGreyLocation = gl.getUniformLocation(shaderProgram,"isGreyscale");
    uIsSepiaLocation = gl.getUniformLocation(shaderProgram,"isSepia");
    uBrightnessLocation = gl.getUniformLocation(shaderProgram,"bright");
    uConstrastLocation = gl.getUniformLocation(shaderProgram,"contrast");
    uIsSmoothLocation = gl.getUniformLocation(shaderProgram,"isSmooth");
    uIsSharpLocation = gl.getUniformLocation(shaderProgram,"isSharp");
    uIsGradientLocation = gl.getUniformLocation(shaderProgram,"isGrad");
    uIsLaplacianLocation = gl.getUniformLocation(shaderProgram,"isLaplace");
	uIsBgOnlyLocation = gl.getUniformLocation(shaderProgram,"isbgonly");

	//texture location in shader
	uBgTextureLocation = gl.getUniformLocation(shaderProgram, "bgimageTexture");
	uFgTextureLocation = gl.getUniformLocation(shaderProgram, "fgimageTexture");
	//enable the attribute arrays
	gl.enableVertexAttribArray(aPositionLocation);
	gl.enableVertexAttribArray(aTexCoordLocation);
	gl.enableVertexAttribArray(aNormalLocation);

	//initialize buffers for the square
	initSquareBuffer()
	sampleTexture = initTextures(textureFile);

	const elem = document.querySelector('#screenshot');
	elem.addEventListener('click', () => {
		drawScene();
		canvas.toBlob((blob) => {
			saveBlob(blob, `screencapture-${canvas.width}x${canvas.height}.png`);
    	});
  	});

  	const saveBlob = (function() {
		const a = document.createElement('a');
		document.body.appendChild(a);
		a.style.display = 'none';
		return function saveData(blob, fileName) {
			const url = window.URL.createObjectURL(blob);
			a.href = url;
			a.download = fileName;
			a.click();
		};
  	}());

	drawScene();
}

function handleImage(ground) {
    var input = document.getElementById('imageInput'+ground);
    var image = input.files[0];

    if (image) {
      // You can perform additional checks or operations here if needed
      // For example, you might want to check the file type or size.

      // Create a FileReader to read the selected image as data URL
      var reader = new FileReader();

      reader.onload = function (e) {
        var imageDataUrl = e.target.result;

        // Store the image data URL in a JavaScript variable
        // You can use this variable as needed in your application
        var imageVariable = imageDataUrl;
        if (ground==0)
            bgImage = initTextures(imageVariable);
        else
            fgImage = initTextures(imageVariable);

      };

      // Read the image as data URL
      reader.readAsDataURL(image);
    }
}

function setImageMode(value) {
    isBgOnly = value;
	drawScene();
}

function handleCheckbox() {
    var checkbox = document.getElementById('greyscale_check');
    isGreyscale = checkbox.checked;

    checkbox = document.getElementById('sepia_check');
    isSepia = checkbox.checked;

    checkbox = document.getElementById('smooth_check');
    isSmooth = checkbox.checked;

    checkbox = document.getElementById('sharpen_check');
    isSharp = checkbox.checked;

    checkbox = document.getElementById('gradient_check');
    isGradient = checkbox.checked;

    checkbox = document.getElementById('laplacian_check');
    isLaplacian = checkbox.checked;

	drawScene();
}

function adjustImage() {
    // Retrieve slider values
    var brightnessSlider = document.getElementById('brightnessSlider');
    var contrastSlider = document.getElementById('contrastSlider');

    brightnessValue = brightnessSlider.value;
    contrastValue = contrastSlider.value;

	drawScene();
}

function resetImage() {
	var elem;

	elem = document.getElementById('none_filter');
	elem.checked = true;

	elem = document.getElementById('brightnessSlider');
	elem.value = 100;
	brightnessValue = 100;

	elem = document.getElementById('contrastSlider');
	elem.value = 100;
	contrastValue = 100;

	elem = document.getElementById('none_process_check');
	elem.checked = true;
	handleCheckbox();
	drawScene();
}
