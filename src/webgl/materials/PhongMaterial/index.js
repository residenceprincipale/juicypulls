import * as THREE from 'three';
import defaultVertexShader from './shaders/vertex.glsl';
import defaultFragmentShader from './shaders/fragment.glsl';

export class PhongCustomMaterial extends THREE.ShaderMaterial {
    constructor({
        vertexShader = defaultVertexShader,
        fragmentShader = defaultFragmentShader,
        defines = {},
        uniforms = {},
        parameters = {}
    } = {}) {
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
            }
        ]);

        const mergedUniforms = THREE.UniformsUtils.merge([
            defaultUniforms,
            uniforms
        ]);

        super({
            vertexShader,
            fragmentShader,
            uniforms: mergedUniforms,
            defines: { ...defines },
            lights: true,
            fog: true,
            transparent: true,
            name: 'PhongMaterial',
            ...parameters
        });
    }
}
