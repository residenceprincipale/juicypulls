varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

uniform float uOpacity;
uniform float uRoughness;
uniform float uWheelsSpacing;
uniform float uWheelsOffset;
uniform float uAOIntensity;
uniform float uBaseRotationOffset;
uniform float uRotation0;
uniform float uRotation1;
uniform float uRotation2;
uniform float uRotation3;
uniform float uRotation4;

uniform sampler2D uMatcapMap;
uniform vec2 uMatcapOffset;
uniform float uMatcapIntensity;

uniform sampler2D uTexture;
uniform sampler2D uNormalTexture;
uniform sampler2D uAoTexture;

vec3 matcap(float roughness) {
  vec3 newNormal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  vec3 x = normalize(vec3(viewDir.z, 0.0, - viewDir.x));
  vec3 y = cross(viewDir, x);
  vec2 uv = vec2(dot(x, newNormal), dot(y, newNormal)) * 0.495 + 0.5; // 0.495 to remove artifacts caused by undersized matcap disks
  uv *= roughness;
  uv.x += uMatcapOffset.x;
  uv.y += uMatcapOffset.y;
  vec3 final = texture2D(uMatcapMap, uv).rgb;
  
  return final;
}

vec2 rotateUV(vec2 uv, float rotation)
{
    float mid = 0.5;
    float cosAngle = cos(rotation);
    float sinAngle = sin(rotation);
    return vec2(
        cosAngle * (uv.x - mid) + sinAngle * (uv.y - mid) + mid,
        cosAngle * (uv.y - mid) - sinAngle * (uv.x - mid) + mid
    );
}

void main()  {
	// AO
	float ao = 1.0;
	vec2 vUvAo = vUv;
	vUvAo.x *= 0.8;
	vUvAo.x += 0.06;
	vec3 aoMap = texture2D( uAoTexture, vUvAo ).rgb;
	ao *= (aoMap.g - 1.0) * uAOIntensity + 1.0;

	vec3 aoColor = vec3(1.0);
	aoColor = mix(aoColor, vec3(0.01, 0.0, 0.01), 1.0 - ao);

	// WHEELS
	vec2 wheelsUv = rotateUV(vUv, 1.5708);
	float wheelWidth = 1.0 / uWheelsSpacing;

	wheelsUv.y += uBaseRotationOffset;
	wheelsUv.y -= uRotation0 * step(wheelWidth * 0.0, wheelsUv.x) * step(wheelsUv.x, wheelWidth * 1.0);
	wheelsUv.y -= uRotation1 * step(wheelWidth * 1.0, wheelsUv.x) * step(wheelsUv.x, wheelWidth * 2.0);
	wheelsUv.y -= uRotation2 * step(wheelWidth * 2.0, wheelsUv.x) * step(wheelsUv.x, wheelWidth * 3.0);
	wheelsUv.y -= uRotation3 * step(wheelWidth * 3.0, wheelsUv.x) * step(wheelsUv.x, wheelWidth * 4.0);
	wheelsUv.y -= uRotation4 * step(wheelWidth * 4.0, wheelsUv.x) * step(wheelsUv.x, wheelWidth * 5.0);

	wheelsUv.x = fract(wheelsUv.x * uWheelsSpacing) / uWheelsSpacing + uWheelsOffset;

	vec3 texture = texture2D( uTexture, wheelsUv ).rgb;

	// GLASS MATCAP
	vec3 matcapColor = clamp((matcap( uRoughness ) - 1.0) * uMatcapIntensity + 1.0, 0.0, 1.0);

	vec3 color = texture * aoColor * matcapColor;

	gl_FragColor = vec4( color, 1.0 );
}
