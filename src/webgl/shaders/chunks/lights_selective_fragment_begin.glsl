IncidentLight directLight;

#if ( NUM_DIR_LIGHTS > 0 )
DirectionalLight directionalLight;

#pragma unroll_loop_start
for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
directionalLight = directionalLights[i];

directLight . color = directionalLight . color;
directLight . direction = directionalLight . direction;
directLight . visible = true ;

// Set light visibility based on selective lighting mode
#ifdef SELECTIVE_DIR_LIGHTS
directLight . visible = uSelectiveLightsArray[i] == 1 ;
#endif

RE_Direct(directLight, -vViewPosition, normal, normalize(vViewPosition), material, reflectedLight);
}
#pragma unroll_loop_end
#endif

#ifdef USE_POINT_LIGHTS
#if ( NUM_POINT_LIGHTS > 0 )
PointLight pointLight;

#pragma unroll_loop_start
for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
pointLight = pointLights[i];

directLight . direction = normalize(pointLight.position-(vViewPosition*-1.0));
directLight . color = pointLight . color;
directLight . color *= getDistanceAttenuation(length(pointLight.position-(vViewPosition*-1.0)), pointLight.distance, pointLight.decay);
directLight . visible = ( directLight . color != vec3(0.0)) ;

RE_Direct(directLight, -vViewPosition, normal, normalize(vViewPosition), material, reflectedLight);
}
#pragma unroll_loop_end
#endif
#endif

RE_IndirectDiffuse(uAmbientColor, material, reflectedLight);
