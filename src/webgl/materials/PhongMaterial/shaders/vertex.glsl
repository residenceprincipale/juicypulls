#define PHONG

varying vec3 vViewPosition;

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

	#ifdef USE_DISPLACEMENTMAP
		#include <displacementmap_vertex>
	#endif

	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>

	vViewPosition = -mvPosition.xyz;

	#ifdef USE_ENVMAP
		#include <worldpos_vertex>
		#include <envmap_vertex>
	#endif

	#include <shadowmap_vertex>
	#include <fog_vertex>
}
