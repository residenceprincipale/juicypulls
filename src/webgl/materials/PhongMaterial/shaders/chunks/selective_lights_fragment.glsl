// Custom selective lighting implementation - directional lights only
vec3 geometryPosition = -vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = normalize( vViewPosition );

// Directional lights with selective processing
#if NUM_DIR_LIGHTS > 0
	DirectionalLight directionalLight;
	IncidentLight selectiveIncident;
	float selectiveDotNL;
	vec3 selectiveIrradiance;
	
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif

	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		
		// Check if this light should be used and process accordingly
		#ifdef USE_SELECTIVE_LIGHTS
			if (uUseLights[i] != 0) {
		#endif
		
		selectiveIncident.color = directionalLight.color;
		selectiveIncident.direction = directionalLight.direction;
		selectiveIncident.visible = true;

		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		selectiveIncident.color *= ( directionalLightShadow.shadowIntensity + ( 1.0 - directionalLightShadow.shadowIntensity ) * getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) );
		#endif

		selectiveDotNL = saturate( dot( geometryNormal, selectiveIncident.direction ) );
		selectiveIrradiance = selectiveDotNL * selectiveIncident.color;

		reflectedLight.directDiffuse += selectiveIrradiance * BRDF_Lambert( material.diffuseColor );
		reflectedLight.directSpecular += selectiveIrradiance * BRDF_BlinnPhong( selectiveIncident.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
		
		#ifdef USE_SELECTIVE_LIGHTS
			}
		#endif
	}
	#pragma unroll_loop_end
#endif

// Ambient light (always included)
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 ambientIrradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		ambientIrradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			ambientIrradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	reflectedLight.indirectDiffuse += ambientIrradiance * BRDF_Lambert( diffuseColor.rgb );
#endif 
