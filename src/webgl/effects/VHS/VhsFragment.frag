const float range = 0.03;
const float offsetIntensity = 0.05;
const float colorOffsetIntensity = .3;
const float noiseQuality = 250.0;
const float invNoiseQuality = 1.0 / noiseQuality;
const float noiseIntensity = 0.003;

float verticalBar(float pos, float uvY, float offset) {
	float edge0 = pos - range;
	float edge1 = pos + range;
	return (smoothstep(edge0, pos, uvY) - smoothstep(pos, edge1, uvY)) * offset;
}

void mainUv(inout vec2 uv) {
	float timeFactor = time * 0.24;
	float timeMod = time * 0.00001;

	for (float barIndex = 0.5; barIndex < 0.71; barIndex += 0.1313) {
		float barPosition = mod(time * barIndex, 1.7);
		float barOffset = sin(1.0 - tan(timeFactor * barIndex)) * offsetIntensity;
		uv.x += verticalBar(barPosition, uv.y, barOffset);
	}

	float uvY = floor(uv.y * noiseQuality) * invNoiseQuality;
	float noise = rand(vec2(timeMod, uvY));
	uv.x += noise * noiseIntensity;
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
	float sinTime = sin(time);
	float cosTime = cos(time * 0.97);

	vec2 offsetR = vec2(0.006 * sinTime, 0.0) * colorOffsetIntensity;
	vec2 offsetG = vec2(0.0073 * cosTime, 0.0) * colorOffsetIntensity;

	float r = texture(inputBuffer, uv + offsetR).r;
	float g = texture(inputBuffer, uv + offsetG).g;
	float b = texture(inputBuffer, uv).b;

	vec3 color = vec3(r, g, b);

	vec3 noiseColor = vec3(rand(floor(uv * 1000.) + sin(time)));
	color += noiseColor * 0.02;


	outputColor = vec4(color , inputColor.a);
}
