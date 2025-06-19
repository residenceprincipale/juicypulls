import * as THREE from 'three';
import defaultVertexShader from './shaders/vertex.glsl';
import defaultFragmentShader from './shaders/fragment.glsl';
import Experience from 'core/Experience.js';
import { getLightsManager } from 'webgl/modules/lightsManager.js';
import SelectiveLightsParsFragment from './shaders/chunks/selective_lights_pars_fragment.glsl';
import SelectiveLightsFragment from './shaders/chunks/selective_lights_fragment.glsl';

export class PhongCustomMaterial extends THREE.ShaderMaterial {
    constructor({
        vertexShader = defaultVertexShader,
        fragmentShader = defaultFragmentShader,
        defines = {},
        uniforms = {},
        parameters = {},
        name = 'CustomPhongMaterial',
        selectedLights = null, // Array of light names to use, e.g., ['lightTop', 'lightLeft'] or null for all lights
    } = {}) {
        const experience = new Experience()
        const resources = experience.scene.resources

        // register chunks
        THREE.ShaderChunk['selective_lights_pars_fragment'] = SelectiveLightsParsFragment;
        THREE.ShaderChunk['selective_lights_fragment'] = SelectiveLightsFragment;

        const processedUniforms = {};
        for (const key in uniforms) {
            const element = uniforms[key];
            if (!element) continue;
            if (typeof element.value === 'string') {
                if (element.value.startsWith('#')) { // color hex
                    processedUniforms[key] = { value: new THREE.Color(element.value) };
                } else if (element.value.startsWith('0x')) { // color not hex
                    processedUniforms[key] = { value: new THREE.Color(parseInt(element.value)) };
                } else { // texture
                    processedUniforms[key] = { value: resources.items[element.value] };
                }
            } else if (element.value !== undefined) {
                if (element.value.z !== undefined) {
                    processedUniforms[key] = { value: new THREE.Vector3(element.value.x, element.value.y, element.value.z) };
                } else if (element.value.y !== undefined) {
                    processedUniforms[key] = { value: new THREE.Vector2(element.value.x, element.value.y) };
                } else {
                    processedUniforms[key] = { value: element.value };
                }
            }
        }

        // Get lights manager and convert light names to indices
        const lightsManager = getLightsManager();
        const selectedLightIndices = lightsManager.getLightIndices(selectedLights);

        // Prepare light selection uniforms and defines
        const maxLights = 8; // Common maximum for most WebGL implementations
        const lightSelectionUniforms = {};
        const selectiveDefines = {};

        if (selectedLightIndices !== null) {
            // Create boolean array uniform for selected lights
            const useLights = new Array(maxLights).fill(0);
            selectedLightIndices.forEach(index => {
                if (index < maxLights) useLights[index] = 1;
            });
            lightSelectionUniforms.uUseLights = { value: useLights };
            selectiveDefines.USE_SELECTIVE_LIGHTS = '';
        } else {
            // Use all lights by default - no define needed
            const useLights = new Array(maxLights).fill(1);
            lightSelectionUniforms.uUseLights = { value: useLights };
        }

        const defaultUniforms = THREE.UniformsUtils.merge([
            THREE.UniformsLib.lights,
            THREE.UniformsLib.fog,
            {
                uAmbientIntensity: { value: 1.0 },
                uDiffuseIntensity: { value: 2.0 },
                uSpecularIntensity: { value: 1.0 },
                uShininess: { value: 100.0 },
                uOpacity: { value: 1.0 },
                uAmbientColor: { value: new THREE.Color(0xffffff) },
                uDiffuseColor: { value: new THREE.Color(0xdd0000) },
                uSpecularColor: { value: new THREE.Color(0xffffff) },
                uEmissiveColor: { value: new THREE.Color(0x000000) }
            },
            lightSelectionUniforms
        ]);

        const mergedUniforms = THREE.UniformsUtils.merge([
            defaultUniforms,
            processedUniforms,
        ]);

        super({
            vertexShader,
            fragmentShader,
            uniforms: mergedUniforms,
            defines: { ...defines, ...selectiveDefines },
            lights: true,
            fog: true,
            transparent: true,
            name,
            ...parameters
        });

        // Store the selected lights and lights manager for potential future updates
        this.selectedLightNames = selectedLights;
        this.lightsManager = lightsManager;
    }

    /**
     * Method to update selected lights at runtime using light names
     * @param {string[]|null} selectedLightNames - Array of light names like ['lightTop', 'lightLeft'] or null for all lights
     */
    setSelectiveLights(selectedLightNames) {
        this.selectedLightNames = selectedLightNames;
        const selectedLightIndices = this.lightsManager.getLightIndices(selectedLightNames);
        const maxLights = 8;

        // Update uniform array
        const useLights = new Array(maxLights).fill(0);
        if (selectedLightIndices !== null) {
            selectedLightIndices.forEach(index => {
                if (index < maxLights) useLights[index] = 1;
            });
            // Add define for selective lighting
            this.defines.USE_SELECTIVE_LIGHTS = '';
        } else {
            // Use all lights - remove define
            useLights.fill(1);
            delete this.defines.USE_SELECTIVE_LIGHTS;
        }

        this.uniforms.uUseLights.value = useLights;
        this.needsUpdate = true;
    }

    /**
     * Get the currently selected light names
     * @returns {string[]|null} Array of selected light names or null if all lights are used
     */
    getSelectedLights() {
        return this.selectedLightNames;
    }

    /**
     * Get all available light names
     * @returns {string[]} Array of all available light names
     */
    getAvailableLightNames() {
        return this.lightsManager.getAvailableLightNames();
    }
}
