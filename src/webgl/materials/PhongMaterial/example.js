import { PhongCustomMaterial } from './index.js';

// Example usage of selective lighting with PhongMaterial using light names

// Example 1: Use all lights (default behavior)
const materialAllLights = new PhongCustomMaterial({
    uniforms: {
        uDiffuseColor: { value: '#ff6b6b' },
        uSpecularColor: { value: '#ffffff' },
        uShininess: { value: 32.0 }
    }
    // selectedLights: null // This is the default, uses all lights
});

// Example 2: Use only specific named lights
const materialSelectiveLights = new PhongCustomMaterial({
    uniforms: {
        uDiffuseColor: { value: '#4ecdc4' },
        uSpecularColor: { value: '#ffffff' },
        uShininess: { value: 64.0 }
    },
    selectedLights: ['lightTop', 'lightLeft'] // Only use lightTop and lightLeft
});

// Example 3: Use only a single light
const materialSingleLight = new PhongCustomMaterial({
    uniforms: {
        uDiffuseColor: { value: '#45b7d1' },
        uSpecularColor: { value: '#ffffff' },
        uShininess: { value: 128.0 }
    },
    selectedLights: ['lightEnv'] // Only use the environment light
});

// Example 4: Update selected lights at runtime using light names
const dynamicMaterial = new PhongCustomMaterial({
    uniforms: {
        uDiffuseColor: { value: '#96ceb4' },
        uSpecularColor: { value: '#ffffff' },
        uShininess: { value: 16.0 }
    },
    selectedLights: ['lightTop', 'lightRight', 'lightEnv'] // Start with these lights
});

// Later in your application, you can update the selected lights
setTimeout(() => {
    dynamicMaterial.setSelectiveLights(['lightLeft', 'lightEnvTwo']); // Switch to different lights
}, 5000);

// Example 5: Turn off selective lighting (use all lights again)
setTimeout(() => {
    dynamicMaterial.setSelectiveLights(null); // Use all lights
}, 10000);

// Example 6: Get available light names for debugging
console.log('Available lights:', dynamicMaterial.getAvailableLightNames());
console.log('Currently selected lights:', dynamicMaterial.getSelectedLights());

export {
    materialAllLights,
    materialSelectiveLights,
    materialSingleLight,
    dynamicMaterial
}; 