void mainUv(inout vec2 uv) {

	uv.y = mod(uv.y + (sin(time *30.)), 1.);

}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {


	float r = texture(inputBuffer, uv + .01).r;
	float g = texture(inputBuffer, uv - .01).g;
	float b = texture(inputBuffer, uv).b;
	vec3 color = vec3(r, g, b);
	vec3 noiseColor = vec3(rand(floor(uv * 1000.) + sin(time)));
	color += noiseColor * 0.1;

	outputColor = vec4(color, inputColor.a);
}
