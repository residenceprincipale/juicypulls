#define PHONG
attribute vec2 uv1;

varying vec3 vViewPosition;
varying vec2 vUv;
varying vec2 vUvMarquee;

#include <common>
#include <uv_pars_vertex>
#include <normal_pars_vertex>
#include <skinning_pars_vertex>
#include <fog_pars_vertex>

void main() {

  #include <uv_vertex>
  #include <skinbase_vertex>

  #include <beginnormal_vertex>
  #include <skinnormal_vertex>
  #include <defaultnormal_vertex>
  #include <normal_vertex>

  #include <begin_vertex>
  #include <skinning_vertex>

  #include <project_vertex>

  vViewPosition = -mvPosition.xyz;
  vUv = uv;
  vUvMarquee = uv1;

  #include <fog_vertex>
}
