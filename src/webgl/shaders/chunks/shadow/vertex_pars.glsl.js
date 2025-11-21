export default /* glsl */`
    // Uniforms
    uniform vec3 uBigLightPos;
    uniform mat4 uShadowCameraProjectMatrix;
    uniform mat4 uShadowCameraWorldInverseMatrix;

    vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
        return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
    }

    #ifdef USE_SHADOWMAP
        #if NUM_DIR_LIGHT_SHADOWS > 0
            uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
            varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
            struct DirectionalLightShadow {
                float shadowBias;
                float shadowNormalBias;
                float shadowRadius;
                vec2 shadowMapSize;
            };
            uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
        #endif
    #endif
`;
