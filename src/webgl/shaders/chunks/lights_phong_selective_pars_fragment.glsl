// Selective DirectionalLight uniforms
#ifdef SELECTIVE_DIR_LIGHTS
uniform int uSelectiveLightsArray[NUM_DIR_LIGHTS];
#endif

uniform bool receiveShadow;

#if NUM_DIR_LIGHTS > 0
struct DirectionalLight {
  vec3 direction;
  vec3 color;
};

uniform DirectionalLight directionalLights[NUM_DIR_LIGHTS];
#endif

#if NUM_POINT_LIGHTS > 0

struct PointLight {
  vec3 position;
  vec3 color;
  float distance;
  float decay;
};

uniform PointLight pointLights[NUM_POINT_LIGHTS];

#define saturate( a ) clamp( a, 0.0, 1.0 )

#endif

float getDistanceAttenuation(const in float lightDistance, const in float cutoffDistance, const in float decayExponent) {
  float distanceFalloff = 1.0 / max(pow(lightDistance, decayExponent), 0.01);
  if (cutoffDistance > 0.0) {
    distanceFalloff *= pow2(saturate(1.0 - pow4(lightDistance / cutoffDistance)));
  }
  return distanceFalloff;
}

#if NUM_SPOT_LIGHTS > 0

struct SpotLight {
  vec3 position;
  vec3 direction;
  vec3 color;
  float distance;
  float decay;
  float coneCos;
  float penumbraCos;
};

uniform SpotLight spotLights[NUM_SPOT_LIGHTS];

float getSpotAttenuation(const in float coneCosine, const in float penumbraCosine, const in float angleCosine) {
  return smoothstep(coneCosine, penumbraCosine, angleCosine);
}

// light is an out parameter as having it as a return value caused compiler errors on some devices
void getSpotLightInfo(const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light) {
  vec3 lVector = spotLight.position - geometryPosition;

  light.direction = normalize(lVector);

  float angleCos = dot(light.direction, spotLight.direction);

  float spotAttenuation = getSpotAttenuation(spotLight.coneCos, spotLight.penumbraCos, angleCos);

  if (spotAttenuation > 0.0) {
    float lightDistance = length(lVector);

    light.color = spotLight.color * spotAttenuation;
    light.color *= getDistanceAttenuation(lightDistance, spotLight.distance, spotLight.decay);
    light.visible = (light.color != vec3(0.0));
  } else {
    light.color = vec3(0.0);
    light.visible = false;
  }
}

#endif

struct BlinnPhongMaterial {
  vec3 diffuseColor;
  vec3 specularColor;
  float specularShininess;
  float specularStrength;
};

void RE_Direct_BlinnPhong(const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight) {
  if (!directLight.visible) return;

  float dotNL = saturate(dot(geometryNormal, directLight.direction));
  vec3 irradiance = dotNL * directLight.color;

  reflectedLight.directDiffuse += irradiance * BRDF_Lambert(material.diffuseColor);

  reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong(directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess) * material.specularStrength;
}

void RE_IndirectDiffuse_BlinnPhong(const in vec3 irradiance, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight) {
  reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert(material.diffuseColor);
}

#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong
