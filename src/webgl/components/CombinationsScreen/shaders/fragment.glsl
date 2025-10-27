#define PHONG

varying vec2 vUv;
varying vec2 vUvMarquee;
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

uniform sampler2D uAmbient;
uniform float uAmbientOpacity;
uniform sampler2D uBars;
uniform float uBarsOpacity;
uniform sampler2D uInner;
uniform float uInnerOpacity;
uniform sampler2D uOuter;
uniform float uOuterOpacity;
uniform sampler2D uStroke;
uniform float uStrokeOpacity;
uniform vec3 uTint;
uniform sampler2D uCombinations;

uniform sampler2D uVideoMarquee;
uniform float uMarqueeOpacity;
uniform vec3 uMarqueeTint;

uniform float uTime;

uniform vec3 uGreenHighlightColor;
uniform vec3 uRedHighlightColor;

uniform float uHighlightIndex1;
uniform float uHighlightIndex2;
uniform float uHighlightIndex3;
uniform float uHighlightIndex4;
uniform float uHighlightIndex5;
uniform float uHighlightIndex6;

uniform float uBlinkingSpeed;

uniform float uBlinkingFactor1;
uniform float uBlinkingFactor2;
uniform float uBlinkingFactor3;
uniform float uBlinkingFactor4;
uniform float uBlinkingFactor5;
uniform float uBlinkingFactor6;

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

  // COMBINATIONS
  vec2 scaledDisplayUv = vUv * 1.2 - 0.1;
  vec4 combinationsTexture = texture2D(uCombinations, scaledDisplayUv);
  // crop colored edges from uv scaling
  combinationsTexture.rgb *= step(scaledDisplayUv.x, 0.99);
  combinationsTexture.rgb *= step(0.01, scaledDisplayUv.y);
  vec4 combinationsColor = combinationsTexture;

  // combi Highlight
  float rows = 7.0;
  float columns = 5.0;

  vec2 gridSize = vec2(1.95, 1.32);
  // automatic centering
  vec2 gridOffset = vec2((gridSize.x - 1.0) / 2.0, (gridSize.y - 1.0) / 2.0);

  vec2 combinationGridUv = vUv * gridSize - gridOffset;
  float gridHighlight = 1.0;

  vec2 combinationGrid = vec2(combinationGridUv.x * columns, (1.0 - combinationGridUv.y) * rows);

  // crop outer parts
  combinationGrid *= step(combinationGridUv.x, 0.99);
  combinationGrid *= step(combinationGridUv.y, 0.99);
  combinationGrid *= step(0.01, combinationGridUv.x);
  combinationGrid *= step(0.01, combinationGridUv.y);

  // select index
  vec2 highlightIndexPos1 = vec2(uHighlightIndex1, 1.0);
  vec2 highlightIndexPos2 = vec2(uHighlightIndex2, 2.0);
  vec2 highlightIndexPos3 = vec2(uHighlightIndex3, 3.0);
  vec2 highlightIndexPos4 = vec2(uHighlightIndex4, 4.0);
  vec2 highlightIndexPos5 = vec2(uHighlightIndex5, 5.0);
  vec2 highlightIndexPos6 = vec2(uHighlightIndex6, 6.0);

  float blinkingOpacity = (sin(uTime * uBlinkingSpeed) + 1.0);

  vec3 combinationHighlightRow1 = getCombinationHighlightZone(combinationGrid, highlightIndexPos1) * uGreenHighlightColor * (blinkingOpacity + 1.0 - uBlinkingFactor1);
  vec3 combinationHighlightRow2 = getCombinationHighlightZone(combinationGrid, highlightIndexPos2) * uGreenHighlightColor * (blinkingOpacity + 1.0 - uBlinkingFactor2);
  vec3 combinationHighlightRow3 = getCombinationHighlightZone(combinationGrid, highlightIndexPos3) * uGreenHighlightColor * (blinkingOpacity + 1.0 - uBlinkingFactor3);
  vec3 combinationHighlightRow4 = getCombinationHighlightZone(combinationGrid, highlightIndexPos4) * uGreenHighlightColor * (blinkingOpacity + 1.0 - uBlinkingFactor4);
  vec3 combinationHighlightRow5 = getCombinationHighlightZone(combinationGrid, highlightIndexPos5) * uGreenHighlightColor * (blinkingOpacity + 1.0 - uBlinkingFactor5);
  vec3 combinationHighlightRow6 = getCombinationHighlightZone(combinationGrid, highlightIndexPos6) * uRedHighlightColor * (blinkingOpacity + 1.0 - uBlinkingFactor6);

  vec3 combinationHighlights = combinationHighlightRow1 + combinationHighlightRow2 + combinationHighlightRow3 + combinationHighlightRow4 + combinationHighlightRow5 + combinationHighlightRow6;
  combinationHighlights = clamp(combinationHighlights, 0.0, 1.0);

  diffuseColor = vec4(combinationsColor.rgb + diffuseColor.rgb, diffuseColor.a);
  diffuseColor.rgb *= 1.0 - vec3(combinationHighlights.r + combinationHighlights.g + combinationHighlights.b) + combinationHighlights;

  // MARQUEE SIDE VIDEOS
  vec4 videoMarquee = texture2D(uVideoMarquee, vUvMarquee);
  videoMarquee *= step(vUvMarquee.x, 0.99);
  videoMarquee *= step(0.01, vUvMarquee.y);
  diffuseColor += videoMarquee * vec4(uMarqueeTint, 1.0) * vec4(uMarqueeOpacity * 2.0);

  // OUTLINES (TO REMOVE LATER)
  vec4 ambientColor = texture2D(uAmbient, vUv);
  vec4 barsColor = texture2D(uBars, vUv);
  vec4 innerColor = texture2D(uInner, vUv);
  vec4 outerColor = texture2D(uOuter, vUv);
  vec4 strokeColor = texture2D(uStroke, vUv);
  // Combine the colors using screen blend mode
  vec4 metalColor = vec4(0.0);
  metalColor = add(metalColor, ambientColor * uAmbientOpacity);
  metalColor = add(metalColor, barsColor * uBarsOpacity * vec4(uTint, 1.0));
  metalColor = add(metalColor, innerColor * uInnerOpacity);
  metalColor = add(metalColor, outerColor * uOuterOpacity * vec4(uTint, 1.0));
  metalColor = add(metalColor, strokeColor * uStrokeOpacity * vec4(uTint, 1.0));

  // diffuseColor += metalColor;

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

  vec3 matcapColor = matcap(matcapRoughness);
  vec3 glassMatcapOverlay = clamp((matcapColor - 1.0) * uMatcapIntensity + 1.0, 0.0, 1.0) * 0.1;
  finalColor += glassMatcapOverlay;
  // finalColor += glassMatcapOverlay * vec3(1.0 - step(0.25, metalColor.r + metalColor.g + metalColor.b));
  #endif

  gl_FragColor = clamp(vec4(finalColor, uOpacity), 0., 1.);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>

  #ifdef USE_FOG
  #include <fog_fragment>
  #endif
}
