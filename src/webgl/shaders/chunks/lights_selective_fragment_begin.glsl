IncidentLight directLight;

#if ( NUM_DIR_LIGHTS > 0 )
	DirectionalLight directionalLight;

    #pragma unroll_loop_start
    for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
        directionalLight = directionalLights[ i ] ;

        directLight.color = directionalLight.color;
        directLight.direction = directionalLight.direction; 
        directLight.visible = true;

        // Set light visibility based on selective lighting mode
        #ifdef SELECTIVE_DIR_LIGHTS
            directLight.visible = uSelectiveLightsArray[i] == 1;
        #endif

        RE_Direct( directLight, -vViewPosition, normal, normalize( vViewPosition ), material, reflectedLight );
    }
    #pragma unroll_loop_end
#endif

RE_IndirectDiffuse( uAmbientColor,  material, reflectedLight );
