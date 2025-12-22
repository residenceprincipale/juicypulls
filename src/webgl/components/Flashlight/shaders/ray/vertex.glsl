varying vec2 vUv;

varying vec3 vWorldNormal;
varying vec3 vViewDirection;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldNormal = normalize(modelMatrix * vec4(normal, 0.0)).xyz;
  vViewDirection = normalize(cameraPosition - worldPosition.xyz);
  vUv = uv; // pass UV to fragment shader
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
