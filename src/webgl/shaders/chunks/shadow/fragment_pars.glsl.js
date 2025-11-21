
export default /* glsl */`
struct uShadow {
    sampler2D map;
    vec2 mapSize;
    float bias;
    float radius;
};


// Varyings
varying vec4 vWorldPosition;
varying vec3 vPosition;
varying vec4 vShadowCoord;
varying mat4 vModelViewMatrix;

// Uniforms
uniform float uShadowBias;
uniform float uShadowRadius;
uniform float uShadowFalloff;
uniform float uLightNear;
uniform float uLightFar;

uniform bool receiveShadow;


uniform float uShadowIntensity;
uniform vec2 uShadowMapSize;

uniform vec3 uDLightPos;
uniform vec3 uShadowColor;


vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}

vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}

#ifdef USE_SHADOWMAP

	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];

	struct DirectionalLightShadow {
		float shadowBias;
		float shadowNormalBias;
		float shadowRadius;
		vec2 shadowMapSize;
	};

	uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];

#endif

vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
	return unpackRGBATo2Half( texture2D( shadow, uv ) );
}

float VSMShadow (sampler2D shadow, vec2 uv, vec2 resolution, float compare ){

	float occlusion = 1.0;

	vec2 distribution = texture2DDistribution( shadow, uv );

	float hard_shadow = step( compare , distribution.x);

	if (hard_shadow != 1.0 ) {

		float distance = compare - distribution.x;
		float variance = max( 0.00000, distribution.y * distribution.y );
		float softness_probability = variance / (variance + distance * distance ); // Chebeyshevs inequality
		softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 ); // 0.3 reduces light bleed
		occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );

	}
	return occlusion;

}

float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {

    float shadow = 1.0;

    shadowCoord.xyz /= shadowCoord.w;
    shadowCoord.z += shadowBias;

    shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowMapSize, shadowCoord.z );

    return shadow;
}

#endif
`;
