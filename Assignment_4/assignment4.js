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
	float siz = 700.0;

	if (isSmooth==1)
	{
		vec4 finalColor = vec4(0.0,0.0,0.0,0.0);
		for(float i=-1.0 ;i<=1.0;i+=1.0)
		{
			for(float j=-1.0;j<=1.0;j+=1.0)
			{
				vec2 newTexCoord = fragTexCoord + vec2(i/siz,j/siz);
				finalColor = finalColor + texture(bgimageTexture,newTexCoord);
			}
		}
		bgtextureColor = finalColor/9.0;
	}
	if (isSharp==1)
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
				vec2 newTexCoord = fragTexCoord + vec2(i/siz,j/siz);
				finalColor = finalColor + param*texture(bgimageTexture,newTexCoord);
			}
		}
		bgtextureColor = finalColor;
	}
	if (isGrad==1)
	{
		vec4 left = texture(bgimageTexture,fragTexCoord+vec2(0,-1.0/siz));
		vec4 right = texture(bgimageTexture,fragTexCoord+vec2(0,1.0/siz));
		vec4 down = texture(bgimageTexture,fragTexCoord+vec2(1.0/siz,0));
		vec4 up = texture(bgimageTexture,fragTexCoord+vec2(-1.0/siz,0));
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
				vec2 newTexCoord = fragTexCoord + vec2(i/siz,j/siz);
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

	uColorLocation = gl.getUniformLocation(shaderProgram,"color");

	//enable the attribute arrays
	gl.enableVertexAttribArray(aPositionLocation);
	gl.enableVertexAttribArray(aNormalLocation);

	//initialize buffers for the square
	drawScene();
}
