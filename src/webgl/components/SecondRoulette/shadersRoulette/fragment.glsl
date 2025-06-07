#define PHONG

varying vec2 vUv;

uniform float uAmbientIntensity;
uniform float uDiffuseIntensity;
uniform float uSpecularIntensity;
uniform float uShininess;
uniform float uOpacity;

uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
uniform vec3 uEmissiveColor;
uniform vec3 uBackgroundColor;

uniform sampler2D uMatcapMap;
uniform vec2 uMatcapOffset;
uniform float uMatcapIntensity;

#ifdef USE_ROUGHNESS
	uniform sampler2D uRoughnessMap;
	uniform vec2 uRoughnessRepeat;
	uniform float uRoughnessIntensity;
#endif

// uniforms
uniform float uRoughness;
uniform float uWheelsSpacing;
uniform float uWheelsOffset;
uniform float uWheelsOffset1;
uniform float uAOIntensity;
uniform float uBaseRotationOffset;
uniform float uRotation0;
uniform float uRotation1;
uniform float uRotation2;
uniform float uRotation3;
uniform float uRotation4;

uniform sampler2D uAlbedoMap;
uniform sampler2D uNormalMap;
uniform vec2 uNormalRepeat;
uniform vec2 uAlbedoRepeat;
uniform vec2 uNormalScale;
uniform sampler2D uAoMap;

#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>

#ifdef USE_MAP
	#include <map_pars_fragment>
#endif

#ifdef USE_SPECULARMAP
	#include <specularmap_pars_fragment>
#endif

#ifdef USE_AOMAP
	#include <aomap_pars_fragment>
#endif

#ifdef USE_ENVMAP
	#include <envmap_common_pars_fragment>
	#include <envmap_pars_fragment>
#endif

#ifdef USE_BUMPMAP
	#include <bumpmap_pars_fragment>
#endif

#ifdef USE_NORMALMAP
	#include <normalmap_pars_fragment>
#endif

mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
	vec3 q0 = dFdx( eye_pos.xyz );
	vec3 q1 = dFdy( eye_pos.xyz );
	vec2 st0 = dFdx( uv.st );
	vec2 st1 = dFdy( uv.st );

	vec3 N = surf_norm; // normalized

	vec3 q1perp = cross( q1, N );
	vec3 q0perp = cross( N, q0 );

	vec3 T = q1perp * st0.x + q0perp * st1.x;
	vec3 B = q1perp * st0.y + q0perp * st1.y;

	float det = max( dot( T, T ), dot( B, B ) );
	float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );

	return mat3( T * scale, B * scale, N );
}

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

void main() {

	vec2 wheelsUv = rotateUV(vUv, 1.5708);
	float wheelWidth = 1.0 / uWheelsSpacing;

	wheelsUv.y += uBaseRotationOffset;
	wheelsUv.y -= uRotation0 * step(wheelWidth * 0.0, wheelsUv.x) * step(wheelsUv.x, wheelWidth * 1.0);
	wheelsUv.y -= uRotation1 * step(wheelWidth * 1.0, wheelsUv.x) * step(wheelsUv.x, wheelWidth * 2.0);

	if (wheelsUv.x >= wheelWidth * 0.0 && wheelsUv.x < wheelWidth * 1.0) {
		wheelsUv.x = fract(wheelsUv.x * uWheelsSpacing) / uWheelsSpacing + uWheelsOffset;
	} else {
		wheelsUv.x = fract(wheelsUv.x * uWheelsSpacing) / uWheelsSpacing + uWheelsOffset1;
	}

	vec4 albedoTexture = texture2D( uAlbedoMap, wheelsUv * uAlbedoRepeat );
	vec3 albedo = mix(uBackgroundColor, albedoTexture.rgb, albedoTexture.a);

	vec4 diffuseColor = vec4(albedo, uOpacity);

	ReflectedLight reflectedLight = ReflectedLight(
		vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0)
	);
	vec3 totalEmissiveRadiance = uEmissiveColor;

	#include <logdepthbuf_fragment>

	#ifdef USE_MAP
		#include <map_fragment>
	#endif

	#include <color_fragment>

	#ifdef USE_SPECULARMAP
		#include <specularmap_fragment>
	#endif

	vec3 normal = normalize(vNormal);

	#ifdef USE_NORMAL
		mat3 tbn = getTangentFrame(-vViewPosition, normal, vUv);
		vec3 normalMap = texture2D(uNormalMap, wheelsUv * uNormalRepeat).xyz * 2.0 - 1.0;
		normalMap.xy *= uNormalScale;
		normal = normalize(tbn * normalMap);
	#endif

	float roughness = 1.;

	#ifdef USE_ROUGHNESS
	roughness = texture2D(uRoughnessMap, vUv * uRoughnessRepeat).r * uRoughnessIntensity * (1.0 - albedoTexture.a);
	#endif

	// Lighting
	BlinnPhongMaterial material;
	material.diffuseColor = diffuseColor.rgb;
	material.specularColor = uSpecularColor;
	material.specularShininess = uShininess;
	material.specularStrength = uSpecularIntensity * roughness * (1.0 - albedoTexture.a);

	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>

	vec3 finalColor = (reflectedLight.directDiffuse * uDiffuseIntensity ) + (reflectedLight.indirectDiffuse * uAmbientIntensity) + reflectedLight.directSpecular + reflectedLight.indirectSpecular + uEmissiveColor;

	// ao
	float ao = 1.;

	#ifdef USE_AO_MAP
		vec4 aoMap = texture2D(uAOMap, vUv * uAOMapRepeat);
		ao *= (aoMap.g - 1.0) * uAOMapIntensity + 1.0;
	#endif

	#ifdef USE_COMBINED_AO_MAP
		vec4 shadowAoMap = texture2D(uAOMap, vUv);
		ao *= (shadowAoMap.g - 1.0) * uAOMapShadowIntensity + 1.0;
		ao *= (shadowAoMap.r - 1.0) * uAOMapOcclusionIntensity + 1.0;
	#endif

	#ifdef USE_VERTEX_AO
		ao *= (vColor.r - 1.) * uAOVertexIntensity + 1.0;

		#ifdef USE_SECONDARY_AO_VERTEX
			ao = mix((vColor.r - 1.) * uAOVertexIntensity + 1.0, (vColor.g - 1.) * uAOVertexIntensity + 1.0, uAOVertexMix);
		#endif
	#endif

	// CUSTOM AO
	vec2 vUvAo = vUv;
	vUvAo.x *= 0.8;
	vUvAo.x += 0.06;
	vec3 aoMap = texture2D( uAoMap, vUvAo * uAlbedoRepeat ).rgb;
	ao *= (aoMap.g - 1.0) * uAOIntensity + 1.0;

	vec3 aoColor = vec3(1.0);
	aoColor = mix(aoColor, vec3(0.01, 0.0, 0.01), 1.0 - ao);

	finalColor = finalColor;

	// matcap
	#ifdef USE_MATCAP
		float matcapRoughness = 1.;

		#ifdef USE_MATCAP_ROUGHNESS
			vec3 matcapNoise = texture2D(uMatcapNoiseMap, vUv * uMatcapNoiseRepeat).rgb;
			matcapRoughness += (matcapNoise.r * uMatcapNoiseChannel.r + matcapNoise.g * uMatcapNoiseChannel.g + matcapNoise.b * uMatcapNoiseChannel.b) * uMatcapNoiseIntensity;
		#endif

		vec3 matcapColor = matcap(matcapRoughness);
		finalColor *= clamp(((matcapColor - 1.0) * uMatcapIntensity + 1.0), 0.0, 1.0) * (1.0 - albedoTexture.a) + 1.0 * albedoTexture.a;
	#endif

	#ifdef USE_ENVMAP
		#include <envmap_fragment>
	#endif

	gl_FragColor = clamp(vec4(finalColor.rgb, diffuseColor.a), 0., 1.);

	#include <tonemapping_fragment>
	#include <colorspace_fragment>

	#ifdef USE_FOG
    	#include <fog_fragment>
	#endif
}
