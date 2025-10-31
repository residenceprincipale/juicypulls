#define PHONG

varying vec2 vUv;
// varying vec2 vUvMarquee;
varying vec3 vNormal;
varying vec3 vViewPosition;

uniform float uAmbientIntensity;
uniform float uDiffuseIntensity;
uniform float uSpecularIntensity;
uniform float uShininess;
uniform float uOpacity;
uniform float uScreenLuminosity;

uniform vec3 uAmbientColor;
uniform vec3 uDiffuseColor;
uniform vec3 uSpecularColor;
uniform vec3 uEmissiveColor;

#ifdef USE_ALBEDO
uniform sampler2D uAlbedoMap;
uniform vec2 uAlbedoRepeat;
uniform float uAlbedoIntensity;
#endif

#ifdef USE_MATCAP
uniform sampler2D uMatcapMap;
uniform vec2 uMatcapOffset;
uniform float uMatcapIntensity;
#endif

#ifdef USE_ROUGHNESS
uniform sampler2D uRoughnessMap;
uniform vec2 uRoughnessRepeat;
uniform float uRoughnessIntensity;
#endif

#ifdef USE_AO
uniform sampler2D uAOMap;
uniform vec2 uAOMapRepeat;
uniform float uAOMapIntensity;
#endif

uniform sampler2D uCombinations;

uniform sampler2D uVideoFarkle;
uniform sampler2D uVideoJackpotx3;
uniform sampler2D uVideoJackpotx4;
uniform sampler2D uVideoJackpotx5;
uniform float uFarkleOpacity;
uniform float uJackpotx3Opacity;
uniform float uJackpotx4Opacity;
uniform float uJackpotx5Opacity;
uniform vec3 uVideoTint;

uniform float uTime;

uniform vec3 uGreenHighlightColor;
uniform vec3 uRedHighlightColor;

uniform float uBlinkingSpeed;

#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <custom_lights_phong_pars_fragment>

#ifdef USE_NORMAL
uniform sampler2D uNormalMap;
uniform vec2 uNormalRepeat;
uniform vec2 uNormalScale;
#endif

#ifdef USE_MATCAP
vec3 matcap(float roughness) {
  vec3 newNormal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  vec3 x = normalize(vec3(viewDir.z, 0.0, -viewDir.x));
  vec3 y = cross(viewDir, x);
  vec2 uv = vec2(dot(x, newNormal), dot(y, newNormal)) * 0.495 + 0.5; // 0.495 to remove artifacts caused by undersized matcap disks
  uv *= roughness;
  uv.x += uMatcapOffset.x;
  uv.y += uMatcapOffset.y;
  vec3 final = texture2D(uMatcapMap, uv).rgb;

  return final;
}
#endif

mat3 getTangentFrame(vec3 eye_pos, vec3 surf_norm, vec2 uv) {
  vec3 q0 = dFdx(eye_pos.xyz);
  vec3 q1 = dFdy(eye_pos.xyz);
  vec2 st0 = dFdx(uv.st);
  vec2 st1 = dFdy(uv.st);

  vec3 N = surf_norm; // normalized

  vec3 q1perp = cross(q1, N);
  vec3 q0perp = cross(N, q0);

  vec3 T = q1perp * st0.x + q0perp * st1.x;
  vec3 B = q1perp * st0.y + q0perp * st1.y;

  float det = max(dot(T, T), dot(B, B));
  float scale = (det == 0.0) ? 0.0 : inversesqrt(det);

  return mat3(T * scale, B * scale, N);
}

float getCombinationHighlightZone(vec2 grid, vec2 index) {
  float zone = 1.0;

  zone *= step(grid.x, index.x + 1.0);
  zone *= step(index.x, grid.x);
  zone *= step(grid.y, index.y + 1.0);
  zone *= step(index.y, grid.y);

  return zone;
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

vec3 screen(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) * (1.0 - blend);
}

vec4 add(vec4 base, vec4 blend) {
  return clamp(base + blend, 0.0, 1.0);
}

void main() {
  vec4 diffuseColor = vec4(uDiffuseColor, uOpacity);

  float blinkingOpacity = (sin(uTime * uBlinkingSpeed) + 1.0);

  // MARQUEE SIDE VIDEOS
  vec4 videoFarkle = texture2D(uVideoFarkle, vUv);
  // videoMarquee *= step(vUvMarquee.x, 0.99);
  // videoMarquee *= step(0.01, vUvMarquee.y);
  // diffuseColor += videoMarquee * vec4(uMarqueeTint, 1.0) * vec4(uMarqueeOpacity * 2.0);
  diffuseColor.rgb = videoFarkle.rgb * uFarkleOpacity;
  ReflectedLight reflectedLight = ReflectedLight(
      vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0)
    );
  vec3 totalEmissiveRadiance = uEmissiveColor;

  #ifdef USE_ALBEDO
  vec3 albedo = texture2D(uAlbedoMap, vUv * uAlbedoRepeat).rgb;
  diffuseColor.rgb = mix(diffuseColor.rgb, albedo, uAlbedoIntensity);
  #endif

  vec3 normal = normalize(vNormal);

  #ifdef USE_NORMAL
  mat3 tbn = getTangentFrame(-vViewPosition, normal, vUv);
  vec3 normalMap = texture2D(uNormalMap, vUv * uNormalRepeat).xyz * 2.0 - 1.0;
  normalMap.xy *= uNormalScale;
  normal = normalize(tbn * normalMap);
  #endif

  float roughness = 1.;

  #ifdef USE_ROUGHNESS
  roughness = texture2D(uRoughnessMap, vUv * uRoughnessRepeat).r * uRoughnessIntensity;
  #endif

  // Lighting (and not Lightning⚡️)
  BlinnPhongMaterial material;
  material.diffuseColor = diffuseColor.rgb;
  material.specularColor = uSpecularColor;
  material.specularShininess = uShininess;
  material.specularStrength = uSpecularIntensity * roughness;

  #include <custom_lights_phong_fragment>

  vec3 finalColor = (reflectedLight.directDiffuse * uDiffuseIntensity) + (reflectedLight.indirectDiffuse * uAmbientIntensity) + reflectedLight.directSpecular + reflectedLight.indirectSpecular + uEmissiveColor;

  // ao
  float ao = 1.;

  #ifdef USE_AO
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

  // ao - mix
  vec3 aoColor = vec3(1.0);
  aoColor = mix(aoColor, vec3(0.01, 0.0, 0.01), 1.0 - ao);

  finalColor = finalColor * aoColor;
  finalColor *= uScreenLuminosity;

  // matcap
  #ifdef USE_MATCAP
  float matcapRoughness = 1.;

  #ifdef USE_MATCAP_ROUGHNESS
  vec3 matcapNoise = texture2D(uMatcapNoiseMap, vUv * uMatcapNoiseRepeat).rgb;
  matcapRoughness += (matcapNoise.r * uMatcapNoiseChannel.r + matcapNoise.g * uMatcapNoiseChannel.g + matcapNoise.b * uMatcapNoiseChannel.b) * uMatcapNoiseIntensity;
  #endif

  vec3 matcapColor = matcap(1.);
  vec3 glassMatcapOverlay = clamp(matcapColor * 0.05 * uMatcapIntensity, 0.0, 1.0);
  finalColor += glassMatcapOverlay;
  #endif

  gl_FragColor = clamp(vec4(finalColor, uOpacity), 0., 1.);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>

  #ifdef USE_FOG
  #include <fog_fragment>
  #endif
}
