attribute vec4 tangent;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vTangent;
varying vec3 vBitangent;

void main() {
	vUv = uv;

	// Transform normal, tangent, and bitangent to view space
	vec3 n = normalize(normalMatrix * normal);
	vec3 t = normalize(normalMatrix * tangent.xyz);
	vec3 b = normalize(cross(n, t) * tangent.w); // handedness from .w

	vNormal = n;
	vTangent = t;
	vBitangent = b;

	vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
	vViewPosition = -mvPosition.xyz;

	gl_Position = projectionMatrix * mvPosition;
}
