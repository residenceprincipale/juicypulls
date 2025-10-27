varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vViewPosition;

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

uniform sampler2D uMatcapMap;
uniform vec2 uMatcapOffset;
uniform float uMatcapIntensity;

#include <common>

vec3 screen(vec3 base, vec3 blend) {
  return 1.0 - (1.0 - base) * (1.0 - blend);
}

vec4 add(vec4 base, vec4 blend) {
  return clamp(base + blend, 0.0, 1.0);
}

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

void main() {
  vec4 color = vec4(0.0);

  // combinations
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
  // just automatic centering
  vec2 gridOffset = vec2((gridSize.x - 1.0) / 2.0, (gridSize.y - 1.0) / 2.0);

  vec2 combinationGridUv = vUv * gridSize - gridOffset;
  float gridHighlight = 1.0;

  vec2 combinationGrid = vec2(combinationGridUv.x * columns, combinationGridUv.y * rows);

  // crop outer parts
  combinationGrid *= step(combinationGridUv.x, 0.99);
  combinationGrid *= step(combinationGridUv.y, 0.99);
  combinationGrid *= step(0.01, combinationGridUv.x);
  combinationGrid *= step(0.01, combinationGridUv.y);

  // select index
  vec2 highlightIndex = vec2(4.0, 5.0);
  float combinationHighlightZone = 1.0;

  combinationHighlightZone *= step(combinationGrid.x, highlightIndex.x + 1.0);
  combinationHighlightZone *= step(highlightIndex.x, combinationGrid.x);
  combinationHighlightZone *= step(combinationGrid.y, highlightIndex.y + 1.0);
  combinationHighlightZone *= step(highlightIndex.y, combinationGrid.y);

  // outlines
  vec4 ambientColor = texture2D(uAmbient, vUv);
  vec4 barsColor = texture2D(uBars, vUv);
  vec4 innerColor = texture2D(uInner, vUv);
  vec4 outerColor = texture2D(uOuter, vUv);
  vec4 strokeColor = texture2D(uStroke, vUv);

  // Combine the colors using screen blend mode
  color = add(color, ambientColor * uAmbientOpacity);
  color = add(color, barsColor * uBarsOpacity * vec4(uTint, 1.0));
  color = add(color, innerColor * uInnerOpacity);
  color = add(color, outerColor * uOuterOpacity * vec4(uTint, 1.0));
  color = add(color, strokeColor * uStrokeOpacity * vec4(uTint, 1.0));

  gl_FragColor = vec4(combinationsColor.rgb + color.rgb, color.r + color.g + color.b);
  // gl_FragColor.rb *= 1.0 - combinationHighlightZone * 0.5;
  gl_FragColor.bg *= 1.0 - combinationHighlightZone * 0.5;

  // vec3 matcapColor = matcap(1.0);
  // gl_FragColor.rbg *= clamp((matcapColor - 1.0) * uMatcapIntensity + 1.0, 0.0, 1.0);
  // gl_FragColor.rg = combinationGrid;
}
