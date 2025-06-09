uniform vec3 uColor;
uniform float uOpacity;
uniform float uMaskProgressStart;
uniform float uMaskProgressEnd;

varying vec2 vUv;

void main() {
    // float mask = step(uMaskProgressStart, vUv.y);
    gl_FragColor = vec4(uColor, uOpacity);
}