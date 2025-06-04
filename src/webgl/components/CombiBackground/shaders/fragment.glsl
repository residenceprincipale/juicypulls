varying vec2 vUv;
uniform sampler2D uAmbient;
uniform float uAmbientOpacity;

vec3 screen(vec3 base, vec3 blend) {
    return 1.0 - (1.0 - base) * (1.0 - blend);
}

vec4 add(vec4 base, vec4 blend) {
    return clamp(base + blend, 0.0, 1.0);
}

void main()  {
    vec4 color = vec4(0.0);
    vec4 ambientColor = texture2D(uAmbient, vUv);

    // Combine the colors using screen blend mode
    color = add(color, ambientColor * uAmbientOpacity);

	gl_FragColor = color;
}
