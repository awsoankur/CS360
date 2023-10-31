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
var uCameraLocation;
var uCanvasWidthLocation;
var uCanvasHeightLocation;
var ulightPosLocation;
var uModeLocation;
var uBounceLocation;

var eyePos = [0.0, 0.0, 3.0]; // camera/eye position
var xCam = 0;
var yCam = 0;
var zCam = 0;
var light = [0.0, 1.0, 3.0]; // light position
var bounce = 1;
var mode = 0;

//////////////////////////////////////////////////////////////////////////
const vertexShaderCode = `#version 300 es
in vec3 aPosition;

void main() {
	gl_Position =vec4(aPosition,1.0);
}`;

const fragShaderCode = `#version 300 es
precision highp float;

uniform vec3 cameraPos;
uniform float canvWidth;
uniform float canvHeight;
uniform vec3 lightPos;
uniform int mode;
uniform int bounce;

struct Sphere {
	vec3 center;
	float radius;
	vec3 color;
};
	
struct Ray {
	vec3 origin;
	vec3 direction;
};

out vec4 fragColor;

void main() {
	vec3 color;

	//	define all spheres
	Sphere spherer, sphereg, sphereb, spheregrey;

	// red sphere
	spherer.center = vec3(0.0,0.5,-0.5);
	spherer.radius = 1.3;
	spherer.color = vec3(1.0,0.0,0.0);

	// green sphere
	sphereg.center = vec3(-1.2,0.3,1.0);
	sphereg.radius = 0.7;
	sphereg.color = vec3(0.0,1.0,0.0);

	// blue sphere
	sphereb.center = vec3(1.2,0.3,1.0);
	sphereb.radius = 0.7;
	sphereb.color = vec3(0.0,0.0,1.0);

	// grey sphere
	spheregrey.center = vec3(0.0,-6,0.0);
	spheregrey.radius = 5.0;
	spheregrey.color = vec3(0.5,0.5,0.5);


	Ray ray;
	ray.origin = cameraPos;
	vec2 screenPos = gl_FragCoord.xy/vec2(canvWidth, canvHeight);
	ray.direction = normalize(vec3(screenPos * 2.0 - 1.0, -1.0));
	vec3 L,hitPos,N,V,R,ambient,diffuse,specular;
	float tca,d2,thc,t0,t1;
	Sphere sphere;

	float mindist = 1000000.0;
	vec3 minhitPos,minN;

	for(int i=0;i<5;i++){
		if (i==0)
			sphere = spherer;
		else if (i==1)
			sphere = sphereg;
		else if (i==2)
			sphere = sphereb;
		else
			sphere = spheregrey;

		L = sphere.center - ray.origin;
		tca = dot(L, ray.direction);
		if (tca < 0.0) continue;
		d2 = dot(L, L) - tca * tca;
		if (d2 > sphere.radius * sphere.radius) continue;
		thc = sqrt(sphere.radius * sphere.radius - d2);
		t0 = tca - thc;
		t1 = tca + thc;
		if (t0 > t1) t0 = t1;
		if (t0 < 0.0) continue;
		hitPos = ray.origin + t0 * ray.direction;
		if (t0 < mindist) {
			mindist = t0;
			minhitPos = hitPos;
			minN = normalize(hitPos - sphere.center);
		}
		else
			continue;

		N = normalize(hitPos - sphere.center);
		L = lightPos - hitPos;
		V = normalize(L);
		R = reflect(V, N);
		ambient = 0.2 * sphere.color;
		diffuse = 0.25 * sphere.color * max(dot(N, L), 0.0);
		specular = 0.5 * vec3(1.0, 1.0, 1.0) * pow(max(dot(-R, V), 0.0), 10.0);
		color = vec3(ambient + diffuse + specular);
	}
	if (mindist == 1000000.0)
		color = vec3(0.0, 0.0, 0.0);
	else if (bounce >0 && (mode == 2 || mode == 3)) 
	{
		Ray ray2;
		for(int i=0;i<bounce;i++)
		{
			ray2.origin = minhitPos;
			ray2.direction = reflect(ray.direction, minN);
			mindist = 1000000.0;
		
			// check reflective hit with all spheres again
			for(int j=0;j<5;j++){
				if (j==0)
					sphere = spherer;
				else if (j==1)
					sphere = sphereg;
				else if (j==2)
					sphere = sphereb;
				else
					sphere = spheregrey;

				L = sphere.center - ray2.origin;
				tca = dot(L, ray2.direction);
				if (tca < 0.0) continue;
				d2 = dot(L, L) - tca * tca;
				if (d2 > sphere.radius * sphere.radius) continue;
				thc = sqrt(sphere.radius * sphere.radius - d2);
				t0 = tca - thc;
				t1 = tca + thc;
				if (t0 > t1) t0 = t1;
				if (t0 < 0.0) continue;
				hitPos = ray2.origin + t0 * ray2.direction;
				if (t0 < mindist) {
					mindist = t0;
					minhitPos = hitPos;
					minN = normalize(hitPos - sphere.center);
				}
				else
					continue;

				N = normalize(hitPos - sphere.center);
				L = lightPos - hitPos;
				V = normalize(L);
				R = reflect(V, N);
				ambient = 0.2 * sphere.color;
				diffuse = 0.25 * sphere.color * max(dot(N, L), 0.0);
				specular = 0.5 * vec3(1.0, 1.0, 1.0) * pow(max(dot(-R, V), 0.0), 10.0);
				color = color*0.5 + 0.5*vec3(ambient + diffuse + specular);
			}
			// if no hit, break
			if (mindist == 1000000.0)
				break;

		}

	}
	fragColor = vec4(color,1.0);
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

function moveLight(pos)
{
	light = [pos/100,1.0,3.0];
	drawScene();
}

function changeBouce(b)
{
	bounce = b;
	drawScene();
}

function setShadeMode(value)
{
	mode = value;
	drawScene();
}

function drawScene() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);

	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);


	// send uniform var
	gl.uniform3fv(uCameraLocation, eyePos);
	gl.uniform3fv(ulightPosLocation, light);
	gl.uniform1f(uCanvasWidthLocation, gl.viewportWidth);
	gl.uniform1f(uCanvasHeightLocation, gl.viewportHeight);
	gl.uniform1i(uModeLocation, mode);
	gl.uniform1i(uBounceLocation, bounce);


	const bufData = new Float32Array([
		-1, 1, 0,
		1, 1, 0,
		-1, -1, 0,
		-1, -1, 0,
		1, 1, 0,
		1, -1, 0
	]);
	
	// // attach buffer 
	const buf = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buf);
	gl.bufferData(gl.ARRAY_BUFFER, bufData, gl.STATIC_DRAW);

	// // set up attribute
	gl.vertexAttribPointer(aPositionLocation, 3, gl.FLOAT, false, 0, 0);

		
	// Draw the square
	gl.drawArrays(gl.TRIANGLES, 0, 6);

}

// This is the entry point from the html
function webGLStart() {
	canvas = document.getElementById("canvas");

	initGL(canvas);
	shaderProgram = initShaders();

	//get locations of attributes declared in the vertex shader
	aPositionLocation = gl.getAttribLocation(shaderProgram, "aPosition");

	uCameraLocation = gl.getUniformLocation(shaderProgram, "cameraPos");
	uCanvasWidthLocation = gl.getUniformLocation(shaderProgram, "canvWidth");
	uCanvasHeightLocation = gl.getUniformLocation(shaderProgram, "canvHeight");
	ulightPosLocation = gl.getUniformLocation(shaderProgram, "lightPos");
	uModeLocation = gl.getUniformLocation(shaderProgram, "mode");
	uBounceLocation = gl.getUniformLocation(shaderProgram, "bounce");

	//enable the attribute arrays
	gl.enableVertexAttribArray(aPositionLocation);

	//initialize buffers for the square
	drawScene();
}
