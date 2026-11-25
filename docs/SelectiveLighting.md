# Selective lighting

Each `PhongCustomMaterial` (`src/webgl/materials/PhongMaterial`) only receives the scene lights it opts into, through its TSL `lightsNode`:

- Point lights with the `USE_POINT_LIGHTS` define, spot lights with `USE_SPOT_LIGHTS`.
- Directional lights always, or only the ones named in the `lights` option when `useSelectiveLights: true`:

```js
new PhongCustomMaterial({
	uniforms: settings,
	defines: { USE_SPOT_LIGHTS: true },
	lights: ['lightTop', 'lightLeft'], // directional light names (LightsMain settings `name`)
	useSelectiveLights: true,
})
```

The list is read when the material is created, so the lights must already be in the scene (`LightsMain` is created before the components).

The ambient term doesn't come from scene lights: it's the material's own `uAmbientColor` × `uAmbientIntensity` (see the settings files). The directional lights are currently disabled (`LightsMain._lightSettings = []`).
