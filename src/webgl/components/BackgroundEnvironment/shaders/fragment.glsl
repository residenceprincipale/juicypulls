#define PHONG

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

uniform float uTime;
uniform float uAmbientIntensity;
uniform float uDiffuseIntensity;
uniform float uSpecularIntensity;
uniform float uShininess;
uniform float uOpacity;
uniform float uAnimationSpeed;

uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
uniform vec3 uEmissiveColor;

uniform sampler2D uMatcapMap;
uniform vec2 uMatcapOffset;
uniform float uMatcapIntensity;

#ifdef USE_ROUGHNESS
	uniform sampler2D uRoughnessMap;
	uniform vec2 uRoughnessRepeat;
	uniform float uRoughnessIntensity;
#endif

uniform float uAOIntensity;
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

vec3 matcap(float roughness) {
  vec3 newNormal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  vec3 x = normalize(vec3(viewDir.z, 0.0, - viewDir.x));
  vec3 y = cross(viewDir, x);
  vec2 uv = vec2(dot(x, newNormal), dot(y, newNormal)) * 0.495 + 0.5;
  uv *= roughness;
  uv.x += uMatcapOffset.x;
  uv.y += uMatcapOffset.y;
  vec3 final = texture2D(uMatcapMap, uv).rgb;
  
  return final;
}

void main() {
	vec4 diffuseColor = vec4(uDiffuseColor, uOpacity);

	// Add animated color variation
	vec3 animatedColor = diffuseColor.rgb;
	animatedColor.r += sin(uTime * uAnimationSpeed + vWorldPosition.x * 2.0) * 0.1;
	animatedColor.g += sin(uTime * uAnimationSpeed * 1.3 + vWorldPosition.y * 2.0) * 0.1;
	animatedColor.b += sin(uTime * uAnimationSpeed * 0.7 + vWorldPosition.z * 2.0) * 0.1;
	
	diffuseColor.rgb = animatedColor;

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

	float roughness = 1.0;

	#ifdef USE_ROUGHNESS
		vec4 roughnessMapColor = texture2D(uRoughnessMap, vUv * uRoughnessRepeat);
		roughness = roughnessMapColor.r * uRoughnessIntensity;
	#endif

	#ifdef USE_MATCAP
		vec3 matcapColor = matcap(roughness);
		diffuseColor.rgb += matcapColor * uMatcapIntensity;
	#endif

	// Ambient
	vec3 ambientLight = uAmbientColor * uAmbientIntensity;
	reflectedLight.indirectDiffuse += ambientLight * diffuseColor.rgb;

	// Diffuse
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>

	// AO
	#ifdef USE_AOMAP
		float ambientOcclusion = (texture2D(uAoMap, vUv).r - 1.0) * uAOIntensity + 1.0;
		reflectedLight.indirectDiffuse *= ambientOcclusion;
	#endif

	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;

	#include <fog_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <dithering_fragment>

	gl_FragColor = vec4(outgoingLight, diffuseColor.a);
} 