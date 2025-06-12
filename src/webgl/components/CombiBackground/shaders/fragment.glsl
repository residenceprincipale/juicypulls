varying vec2 vUv;
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
    vec4 innerColor = texture2D(uInner, vUv);
    vec4 outerColor = texture2D(uOuter, vUv);
    vec4 strokeColor = texture2D(uStroke, vUv);

    // Combine the colors using screen blend mode
    color = add(color, ambientColor * uAmbientOpacity);
    color = add(color, barsColor * uBarsOpacity * vec4(uTint, 1.0));
    color = add(color, innerColor * uInnerOpacity );
    color = add(color, outerColor * uOuterOpacity * vec4(uTint, 1.0) );
    color = add(color, strokeColor * uStrokeOpacity * vec4(uTint, 1.0) );

	gl_FragColor = vec4(color.rgb, color.r + color.g + color.b);
}
