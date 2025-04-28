import * as THREE from 'three';
import defaultVertexShader from './shaders/vertex.glsl';
import defaultFragmentShader from './shaders/fragment.glsl';
import Experience from 'core/Experience.js'


export class PhongCustomMaterial extends THREE.ShaderMaterial {
    constructor({
        vertexShader = defaultVertexShader,
        fragmentShader = defaultFragmentShader,
        defines = {},
        uniforms = {},
        parameters = {},
        name = 'CustomPhongMaterial',
    } = {}) {
        const experience = new Experience()
        const resources = experience.scene.resources

        const processedUniforms = {};
        for (const key in uniforms) {
            const element = uniforms[key];
            if (!element) continue;
            if (element.value === undefined) continue;
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
        ]);

        const mergedUniforms = THREE.UniformsUtils.merge([
            defaultUniforms,
            processedUniforms,
        ]);

        super({
            vertexShader,
            fragmentShader,
            uniforms: mergedUniforms,
            defines: { ...defines },
            lights: true,
            fog: true,
            transparent: true,
            name,
            ...parameters
        });
    }
}
