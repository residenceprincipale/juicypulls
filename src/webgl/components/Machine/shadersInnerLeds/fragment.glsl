uniform vec3 uColor;
uniform float uOpacity;

uniform float uLockedOpacity0;
uniform float uLockedOpacity1;
uniform float uLockedOpacity2;
uniform float uLockedOpacity3;
uniform float uLockedOpacity4;

uniform vec3 uLockedColor0;
uniform vec3 uLockedColor1;
uniform vec3 uLockedColor2;
uniform vec3 uLockedColor3;
uniform vec3 uLockedColor4;

varying vec2 vUv;

void main() {
    vec3 color = uColor;

    if (vUv.x < 0.2) {
        color = mix(color, uLockedColor0, uLockedOpacity0);
    } else if (vUv.x < 0.4) {
        color = mix(color, uLockedColor1, uLockedOpacity1);
    } else if (vUv.x < 0.6) {
        color = mix(color, uLockedColor2, uLockedOpacity2);
    } else if (vUv.x < 0.8) {
        color = mix(color, uLockedColor3, uLockedOpacity3);
    } else {
        color = mix(color, uLockedColor4, uLockedOpacity4);
    }
    
    gl_FragColor = vec4(color, uOpacity);
}