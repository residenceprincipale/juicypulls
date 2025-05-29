#define PHONG

varying vec3 vViewPosition;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

uniform float uTime;
uniform float uScale;
uniform float uDisplacement;

#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <normal_pars_vertex>
#include <shadowmap_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>

#ifdef USE_DISPLACEMENTMAP
	#include <displacementmap_pars_vertex>
#endif

#ifdef USE_ENVMAP
	#include <envmap_pars_vertex>
#endif

void main() {

	#include <uv_vertex>
	#include <color_vertex>

	#include <beginnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>

	#include <begin_vertex>

	// Add some animated displacement
	vec3 pos = position;
	pos.y += sin(uTime * 2.0 + position.x * 5.0) * uDisplacement * 0.1;
	pos.x += cos(uTime * 1.5 + position.z * 3.0) * uDisplacement * 0.05;
	
	// Apply scale
	pos *= uScale;

	#ifdef USE_DISPLACEMENTMAP
		#include <displacementmap_vertex>
	#endif

	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>

	vViewPosition = -mvPosition.xyz;
	vUv = uv;
	vNormal = normalize(normalMatrix * normal);
	vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;

	#ifdef USE_ENVMAP
		#include <worldpos_vertex>
		#include <envmap_vertex>
	#endif

	#include <shadowmap_vertex>
	#include <fog_vertex>
} 