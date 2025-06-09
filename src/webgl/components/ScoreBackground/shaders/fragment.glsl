varying vec2 vUv;
uniform sampler2D uAmbient;
uniform sampler2D uBars;
uniform sampler2D uBottomLeft;
uniform sampler2D uBottomRight;
uniform sampler2D uStroke;
uniform sampler2D uTop;
uniform float uAmbientOpacity;
uniform float uBarsOpacity;
uniform float uBottomLeftOpacity;
uniform float uBottomRightOpacity;
uniform float uStrokeOpacity;
uniform float uTopOpacity;

vec3 screen(vec3 base, vec3 blend) {
    return 1.0 - (1.0 - base) * (1.0 - blend);
}

vec4 add(vec4 base, vec4 blend) {
    return clamp(base + blend, 0.0, 1.0);
}

void main()  {
    vec4 color = vec4(0.0);
    vec4 ambientColor = texture2D(uAmbient, vUv);
    vec4 barsColor = texture2D(uBars, vUv);
    vec4 bottomLeftColor = texture2D(uBottomLeft, vUv);
    vec4 bottomRightColor = texture2D(uBottomRight, vUv);
    vec4 strokeColor = texture2D(uStroke, vUv);
    vec4 topColor = texture2D(uTop, vUv);

    // Combine the colors using screen blend mode
    color = add(color, ambientColor * uAmbientOpacity);
    color = add(color, barsColor * uBarsOpacity);
    color = add(color, bottomLeftColor * uBottomLeftOpacity);
    color = add(color, bottomRightColor * uBottomRightOpacity);
    color = add(color, strokeColor * uStrokeOpacity);
    color = add(color, topColor * uTopOpacity);

	gl_FragColor = color;
}
