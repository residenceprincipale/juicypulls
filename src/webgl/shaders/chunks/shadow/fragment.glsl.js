export default /* glsl */`
float shadow = 1.;
#ifdef USE_SHADOWMAP
    #if NUM_DIR_LIGHT_SHADOWS > 0
        DirectionalLight light;
        DirectionalLightShadow lightShadow;
        light = directionalLights[0];
        lightShadow = directionalLightShadows[0];
        shadow *= receiveShadow ? getShadow( directionalShadowMap[ 0 ], lightShadow.shadowMapSize, lightShadow.shadowBias, lightShadow.shadowRadius, vDirectionalShadowCoord[ 0 ] ) : 1.;

        vec3 shadowColor = mix(uShadowColor, vec3(1.0), shadow);
    #endif
#endif

shadowColor = vec3(1.0) - (vec3(1.0) - shadowColor)  * uShadowIntensity;

diffuseColor.rgb = shadowColor;
`;
