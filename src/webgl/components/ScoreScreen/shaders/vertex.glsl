#define PHONG
attribute vec2 uv1;

// Text Attributes
// attribute vec2 layoutUv;

// attribute float lineIndex;

// attribute float lineLettersTotal;
// attribute float lineLetterIndex;

// attribute float lineWordsTotal;
// attribute float lineWordIndex;

// attribute float wordIndex;

// attribute float letterIndex;

varying vec3 vViewPosition;
varying vec2 vUv;
// varying vec2 vUvMarquee;

// // Text Varyings
// varying vec2 vLayoutUv;
// varying float vLineIndex;

// varying float vLineLettersTotal;
// varying float vLineLetterIndex;

// varying float vLineWordsTotal;
// varying float vLineWordIndex;

// varying float vWordIndex;

// varying float vLetterIndex;

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
  // vUvMarquee = uv1;
  // vLayoutUv = layoutUv;

  // vLineIndex = lineIndex;

  // vLineLettersTotal = lineLettersTotal;
  // vLineLetterIndex = lineLetterIndex;

  // vLineWordsTotal = lineWordsTotal;
  // vLineWordIndex = lineWordIndex;

  // vWordIndex = wordIndex;

  // vLetterIndex = letterIndex;

  #include <fog_vertex>
}
