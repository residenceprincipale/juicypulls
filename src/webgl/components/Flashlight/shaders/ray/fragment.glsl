varying vec2 vUv;
varying vec3 vWorldNormal;
varying vec3 vViewDirection;

uniform sampler2D uNoiseTexture;
uniform float uNoiseIntensity;
uniform float uNoiseSpeed;
uniform float uTime;
uniform vec3 uColor;
uniform float uFresnelPower;

void main() {
  float fresnelFactor = abs(dot(vViewDirection, vWorldNormal));
  // float inversefresnelFactor = 1.0 - fresnelFactor;
  float fresnelFactor1 = pow(fresnelFactor, uFresnelPower);
  // float fresnelFactor2 = pow(fresnelFactor, 4.0);
  // inversefresnelFactor = pow(inversefresnelFactor, uFresnelPower);

  float noise = texture2D(uNoiseTexture, vUv + uTime * 0.00001 * uNoiseSpeed).r * uNoiseIntensity;
  float easeOutDistance = 1.0 - smoothstep(0.0, 0.2, vUv.y);
  // float easeOutDistance2 = 1.0 - smoothstep(0.6, 1.0, vUv.y);
  gl_FragColor = vec4(1.0, 1.0, 1.0, 0.1 * fresnelFactor1 * noise * easeOutDistance);
  gl_FragColor.rgb = uColor;
  // gl_FragColor.a += 0.03 * fresnelFactor2 * noise * easeOutDistance2;
}
