varying vec2 vUv;
uniform float uTime;

float random (vec2 st) {
    return fract(sin(dot(st.xy,
                         vec2(12.9898,78.233)))*
        43758.5453123);
}

void main() {
	vec3 color = vec3(random(floor(vUv * 1000.) + sin(uTime)));
	gl_FragColor = vec4(color, 1.);
}
