uniform vec3 uColor;
uniform float uOpacity;
uniform vec3 uLockedColor;
uniform float uLockedOpacity0;
uniform float uLockedOpacity1;
uniform float uLockedOpacity2;
uniform float uLockedOpacity3;
uniform float uLockedOpacity4;

varying vec2 vUv;

void main() {
    vec3 color = mix(uColor, uLockedColor, uLockedOpacity0);

    if (vUv.x < 0.2) {
        color = mix(color, uLockedColor, uLockedOpacity0);
    } else if (vUv.x < 0.4) {
        color = mix(color, uLockedColor, uLockedOpacity1);
    } else if (vUv.x < 0.6) {
        color = mix(color, uLockedColor, uLockedOpacity2);
    } else if (vUv.x < 0.8) {
        color = mix(color, uLockedColor, uLockedOpacity3);
    } else {
        color = mix(color, uLockedColor, uLockedOpacity4);
    }
    
    gl_FragColor = vec4(color, uOpacity);
}