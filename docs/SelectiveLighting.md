# Selective Lighting System

The selective lighting system allows materials to selectively choose which directional lights affect them, rather than being lit by all available directional lights in the scene. This provides fine-grained control over lighting on a per-material basis.

## Overview

The system operates in two modes:
- **Selective Mode**: Materials can choose specific lights that affect them
- **Normal Mode**: Materials receive light from all available lights (standard Three.js behavior)

## Components

### 1. SelectiveLightManager

Located in `src/webgl/core/SelectiveLightManager.js`, this class manages the configuration of selective lights.

**Key Methods:**
- `initializeLights(lightSettings)` - Initialize with light configuration
- `getMaterialUniforms(selectedLights)` - Get uniforms for a specific material
- `getAvailableLights()` - Get list of all available lights

### 2. Light Configuration

Each light in the system can be configured with a `selective` property:

```javascript
// In lightSettings-1.js
export default {
    "name": "lightTop",
    "selective": true,    // This light can be selectively used
    "visible": { "value": true },
    // ... other settings
}
```

- `selective: true` - Light can be selectively chosen by materials
- `selective: false` - Light affects all materials regardless of selection (non-selective)

### 3. PhongCustomMaterial

Enhanced to support selective lighting with new constructor options:

```javascript
const material = new PhongCustomMaterial({
    name: 'My Material',
    useSelectiveLights: true,           // Enable selective lighting
    lights: ['lightTop', 'lightLeft'], // Lights that affect this material
    uniforms: {
        uDiffuseColor: { value: '#ff6b6b' }
    }
});
```

## Usage Examples

### Basic Selective Material

```javascript
// Material that only responds to top and left lights
const material = new PhongCustomMaterial({
    name: 'Selective Material',
    useSelectiveLights: true,
    lights: ['lightTop', 'lightLeft'],
    uniforms: {
        uDiffuseColor: { value: '#ff6b6b' },
        uDiffuseIntensity: { value: 1.5 }
    }
});
```

### Normal Material (All Lights)

```javascript
// Material that receives all lights (standard behavior)
const material = new PhongCustomMaterial({
    name: 'Normal Material',
    useSelectiveLights: false,
    uniforms: {
        uDiffuseColor: { value: '#45b7d1' }
    }
});
```

### Environment-Only Material

```javascript
// Material that only responds to environment lights
const material = new PhongCustomMaterial({
    name: 'Environment Material',
    useSelectiveLights: true,
    lights: ['lightEnv', 'lightEnvTwo'],
    uniforms: {
        uDiffuseColor: { value: '#f7b801' }
    }
});
```

### Dynamic Light Changes

```javascript
// Change which lights affect a material at runtime
material.updateSelectiveLights(['lightRight', 'lightEnv']);
```

## Available Lights

The current system provides these lights:
- `lightTop` (selective)
- `lightLeft` (selective)
- `lightRight` (selective)
- `lightEnv` (non-selective)
- `lightEnvTwo` (non-selective)

You can get the available lights programmatically:

```javascript
const experience = new Experience();
const availableLights = experience.selectiveLightManager.getAvailableLights();
console.log('Available lights:', availableLights);
```

## How It Works

### 1. Shader Chunk Registration
Custom shader chunks are automatically added to `THREE.ShaderChunk` when the PhongMaterial is imported:
```javascript
THREE.ShaderChunk['custom_lights_phong_pars_fragment'] = customLightsPhongParsFragment;
THREE.ShaderChunk['custom_lights_phong_fragment'] = customLightsPhongFragment;
```

These custom chunks replace the default Three.js lighting and are used by all PhongCustomMaterial instances.

### 2. Light Configuration
Each light is marked as selective or non-selective in its settings file.

### 3. Manager Initialization
The `SelectiveLightManager` creates arrays tracking which lights are selective.

### 4. Material Creation
When creating a material with `useSelectiveLights: true`, the manager generates uniforms controlling which lights affect that specific material.

### 5. Shader Processing
Custom shader chunks are always included in the fragment shader, replacing the default Three.js lighting:

```glsl
#include <custom_lights_phong_pars_fragment>
```

```glsl
#include <custom_lights_phong_fragment>
```

The custom chunks handle both selective and non-selective lighting automatically.

### 6. Light Visibility
In the fragment shader, each directional light's visibility is determined:

```glsl
#ifdef SELECTIVE_DIR_LIGHTS
    directLight.visible = uSelectiveLightsArray[i] == 1;
#else
    directLight.visible = uNonSelectiveLightsArray[i] == 1;
#endif
```

## Shader Defines

- `SELECTIVE_DIR_LIGHTS` - Enables selective lighting mode for a material
- When not defined, materials use non-selective lighting (but still use the custom chunks)

## Performance Considerations

- Non-selective materials have the same performance as standard Three.js materials
- Selective materials have minimal overhead (just array lookups in shaders)
- The system only affects directional lights; point and spot lights remain unaffected

## Debugging

Enable console logging to see which lights are configured for each material:

```javascript
// Logs will show:
// "Material 'My Material' using selective lights: ['lightTop', 'lightLeft']"
// "Updated material 'My Material' selective lights: ['lightRight']"
```

## Example Implementation

See `src/webgl/examples/SelectiveLightingExample.js` for a complete working example that demonstrates:
- Multiple materials with different light selections
- Dynamic light changes
- Various usage patterns

## Integration

To use selective lighting in your scene:

1. Ensure lights are configured with `selective` properties
2. Create materials with `useSelectiveLights: true` and specify desired `lights`
3. The system handles the rest automatically

The selective lighting system provides powerful control over scene lighting while maintaining compatibility with existing Three.js workflows. 