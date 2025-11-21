uniform sampler2D uFaceTexture;
uniform float uFaceIndex;
uniform float uOpacity;

varying vec2 vUv;

void main() {
  // Calculate which face to show (0-8)
  float faceIndex = floor(uFaceIndex);

  // Calculate grid position (3x3 grid)
  float x = mod(faceIndex, 3.0);
  float y = floor(faceIndex / 3.0);

  // Scale UV to 1/3 of the texture and offset to the correct square
  vec2 scaledUV = vUv * (1.0 / 3.0);
  vec2 offsetUV = scaledUV + vec2(x / 3.0, y / 3.0);

  // Sample the texture
  vec4 faceColor = texture2D(uFaceTexture, offsetUV);

  // Convert to grayscale using luminance weights
  float gray = dot(faceColor.rgb, vec3(0.299, 0.587, 0.114));

  gl_FragColor = vec4(vec3(gray) * 1.0, faceColor.a * uOpacity);
}
