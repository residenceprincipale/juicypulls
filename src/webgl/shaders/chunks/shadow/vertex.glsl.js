export default /* glsl */`
vWorldPosition = modelMatrix*vec4(position, 1.0);
vec3 objectNormal = vec3(normal);
vec3 transformedNormal = objectNormal * normalMatrix;
vec3 shadowWorldNormal = inverseTransformDirection(transformedNormal, viewMatrix);

vec4 bigShadowWorldPosition = vWorldPosition+vec4(shadowWorldNormal*directionalLightShadows[ 0 ].shadowNormalBias, 0);
vDirectionalShadowCoord[ 0 ] = directionalShadowMatrix[0 ]*bigShadowWorldPosition;
`;
