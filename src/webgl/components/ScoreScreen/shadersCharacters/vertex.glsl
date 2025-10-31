#define PHONG
attribute vec2 uv1;

attribute float _isquota;
attribute float _isquotabar;
attribute float _isbank;
attribute float _isjetons;
attribute float _isscore;
attribute float _numberdecimal;

varying float vIsBank;
varying float vIsJetons;
varying float vIsScore;
varying float vIsQuota;
varying float vIsQuotaBar;
varying float vNumberDecimal;

varying vec3 vViewPosition;
varying vec2 vUv;
varying vec2 vUvQuotaBar;

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
  vUvQuotaBar = uv1;

  vIsBank = step(0.5, _isbank);
  vIsJetons = step(0.5, _isjetons);
  vIsScore = step(0.5, _isscore);
  vIsQuota = step(0.5, _isquota);
  vIsQuotaBar = step(0.5, _isquotabar);
  vNumberDecimal = _numberdecimal;

  #include <fog_vertex>
}
