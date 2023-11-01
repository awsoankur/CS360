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
var light = [0.0, 2.0, 2.0]; // light position
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
	float shine;
	float specsize;
};
	
struct Ray {
	vec3 origin;
	vec3 direction;
};

out vec4 fragColor;

// solve the quadratic equation
bool solveQuadratic(float a, float b, float c, out float t0, out float t1)
{
    float disc = b * b - 4. * a * c;
    
    if (disc < 0.0)
    {
        return false;
    } 
    
    if (disc == 0.0)
    {
        t0 = t1 = -b / (2. * a);
        return true;
    }
    
    t0 = (-b + sqrt(disc)) / (2. * a);
    t1 = (-b - sqrt(disc)) / (2. * a);
    return true;    
}

// check for intersection of ray with sphere
bool intersectSphere(
    vec3 origin, 
    vec3 direction, 
    Sphere sphere, 
    out float dist, 
    out vec3 surfaceNormal, 
    out vec3 Phit)
{
    vec3 L = origin - sphere.center;
    
    float a = dot(direction, direction);
    float b = 2. * dot(direction, L);
    float c = dot(L, L) - pow(sphere.radius, 2.);
    
    float t0;
    float t1;
    
    if (solveQuadratic(a, b, c, t0, t1))
    {        
        if (t0 - t1 > 0.0) 
        {
        	float temp = t0;
            t0 = t1;
            t1 = temp;
        } 
 
        if (t0 < 0.0)
        { 
            t0 = t1; // if t0 is negative, let's use t1 instead 
            if (t0 < 0.) return false; // both t0 and t1 are negative 
        }  
             
        dist = t0;
       
        Phit = origin + dist * direction;
        surfaceNormal = normalize(Phit - sphere.center);               
        
        return true;
    }  
     
    return false;
}

bool checkShadow(vec3 origin, vec3 direction,Sphere sphere[4])
{

	for(int i=0;i<4;i++){
		float t0;
		vec3 N,hitPos;
		if (intersectSphere(origin, direction, sphere[i], t0, N, hitPos) == true)
			return true;
	}	
	return false;
}

void main() {
	vec3 color;

	//	define all spheres
	Sphere spherer, sphereg, sphereb, spheregrey;

	// red sphere
	spherer.center = vec3(0.0,0.5,-0.9);
	spherer.radius = 1.5;
	spherer.color = vec3(1.0,0.0,0.0);
	spherer.shine = 0.6;
	spherer.specsize = 2.5;

	// green sphere
	sphereg.center = vec3(-1.2,0.3,1.1);
	sphereg.radius = 0.7;
	sphereg.color = vec3(0.0,1.0,0.0);
	sphereg.shine = 0.5;
	sphereg.specsize = 7.0;

	// blue sphere
	sphereb.center = vec3(1.2,0.3,1.1);
	sphereb.radius = 0.7;
	sphereb.color = vec3(0.0,0.0,1.0);
	sphereb.shine = 1.0;
	sphereb.specsize = 20.0;

	// grey sphere
	spheregrey.center = vec3(0.0,-8.3,-0.3);
	spheregrey.radius = 7.0;
	spheregrey.color = vec3(0.8,0.8,0.8);
	spheregrey.shine = 0.5;
	spheregrey.specsize = 10.0;

	Sphere sphere[4];
	sphere[0] = spherer;
	sphere[1] = sphereg;
	sphere[2] = sphereb;
	sphere[3] = spheregrey;

	Ray ray;
	ray.origin = cameraPos;
	vec2 screenPos = gl_FragCoord.xy/vec2(canvWidth, canvHeight);
	ray.direction = normalize(vec3(screenPos * 2.0 - 1.0, -1.0));
	vec3 L,hitPos,N,V,R,ambient,diffuse,specular;
	float tca,d2,thc,t0,t1;

	float mindist = 1000000.0;
	vec3 minhitPos,minN;

	for(int i=0;i<4;i++){

		if (intersectSphere(ray.origin, ray.direction, sphere[i], t0, N, hitPos) == false)
			continue;
		if (t0 < mindist) {
			mindist = t0;
			minhitPos = hitPos;
			minN = N;
		}
		else
			continue;

		L = normalize(lightPos - hitPos);
		V = normalize(L);
		R = reflect(V, N);
		ambient = 0.2 * sphere[i].color;
		diffuse = 0.4 * sphere[i].color * max(dot(N, L), 0.0);
		specular = sphere[i].shine * vec3(1.0, 1.0, 1.0) * pow(max(dot(-R,V), 0.0), sphere[i].specsize);

		// check if the fragment is in shadow
		if ((mode == 1 || mode == 3) && checkShadow(hitPos + 0.001 * L , L, sphere) == true)
			color = ambient;
		else	
			color = vec3(ambient + diffuse + specular);
	}
	vec3 curhit = minhitPos;
	if (mindist == 1000000.0){
		color = vec3(0.0, 0.0, 0.0);
	}
	else if (bounce >0 && (mode == 2 || mode == 3)) 
	{
		// check for reflective fragment
		Ray ray2;
		ray2.direction = ray.direction;
		vec3 newc = vec3(1.0);
		for(int i=0;i<bounce;i++)
		{
			ray2.origin = minhitPos;
			ray2.direction = reflect(ray2.direction, minN);
			mindist = 1000000.0;
		
			// check reflective hit with all spheres again
			for(int j=0;j<4;j++){
				if (intersectSphere(ray2.origin + 0.001 * ray2.direction, ray2.direction, sphere[j], t0, N, hitPos) == false)
					continue;
				if (t0 < mindist) {
					mindist = t0;
					minhitPos = hitPos;
					minN = N;
				}
				else
					continue;

				L = normalize(lightPos - hitPos);
				V = normalize(L);
				R = reflect(V, N);
				ambient = 0.2 * sphere[j].color;
				diffuse = 0.4 * sphere[j].color * max(dot(N, L), 0.0);
				specular = sphere[j].shine * vec3(1.0, 1.0, 1.0) * pow(max(dot(-R, V), 0.0), sphere[j].specsize);
				newc = newc*0.1 + 0.9*vec3(ambient + diffuse + specular);
			}
			// if no hit, break
			if (mindist == 1000000.0)
				break;
			color = (color + newc)/2.0;
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
	light = [pos/100,2.0,2.0];
	document.getElementById("lightValue").innerHTML = pos/100;
	drawScene();
}

function changeBouce(b)
{
	bounce = b;
	document.getElementById("bounceValue").innerHTML = b;
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
