// Vendor
import { AdditiveBlending, Color, LinearFilter, MeshBasicMaterial, RGBAFormat, ShaderMaterial, UniformsUtils, Vector2, Vector3, WebGLRenderTarget, RawShaderMaterial, HalfFloatType } from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';
import { LuminosityHighPassShader } from './LuminosityHighPassShader.js';

// Shaders
import compositeVertexShader from './shaders/composite/vertex.glsl';
import compositeFragmentShader from './shaders/composite/fragment.glsl';
import blurVertexShader from './shaders/blur/vertex.glsl';
import blurFragmentShader from './shaders/blur/fragment.glsl';
import bloomOverrideVertexShader from './shaders/bloom-override/vertex.glsl';
import bloomOverrideFragmentShader from './shaders/bloom-override/fragment.glsl';
import textureVertexShader from './shaders/texture/vertex.glsl';
import textureFragmentShader from './shaders/texture/fragment.glsl';

// Contants
const MIP_LEVELS = 5;
const BLUR_DIRECTION_X = new Vector2(1.0, 0.0);
const BLUR_DIRECTION_Y = new Vector2(0.0, 1.0);

// Types
const SELECTIVE = 'SELECTIVE';
const LUMINOSITY = 'LUMINOSITY';
const TEXTURE = 'TEXTURE';

/**
 * UnrealBloomPass is inspired by the bloom pass of Unreal Engine. It creates a
 * mip map chain of bloom textures and blurs them with different radii. Because
 * of the weighted combination of mips, and because larger blurs are done on
 * higher mips, this effect provides good quality and performance.
 *
 * Reference:
 * - https://docs.unrealengine.com/latest/INT/Engine/Rendering/PostProcessEffects/Bloom/
 */
class CustomUnrealBloomPass extends Pass {
    constructor(options = {}) {
        super();

        // Options
        this._type = options.type || LUMINOSITY;
        this._strength = (options.strength !== undefined) ? options.strength : 1;
        this._radius = options.radius || 0.1;
        this._threshold = options.threshold || 0;
        this._smoothWidth = options.smoothWidth || 1.0;
        this._resolution = (options.resolution !== undefined) ? new Vector2(options.resolution.x, options.resolution.y) : new Vector2(256, 256);
        this._texture = options.texture;
        this._camera = options.camera;
        this._scene = options.scene;
        this._dpr = options.dpr || 1;

        // Props
        this._clearColor = new Color(0, 0, 0); // create color only once here, reuse it later inside the render function
        this._oldClearColor = new Color();
        this._oldClearAlpha = 1;

        // Setup
        this._renderTargetBright = this._createRenderTargetBright();
        this._renderTargetsBlur = this._createRenderTargetsBlur();
        this._separableBlurMaterials = this._createSeparableBlurMaterials();
        this._compositeMaterial = this._createCompositeMaterial();
        this._materialCopy = this._createMaterialCopy();
        this._basicMaterial = this._createBasicMaterial();
        this._fullscreenQuad = this._createFullscreenQuad();

        if (this._type === LUMINOSITY) {
            this._materialHighPassFilter = this._createMaterialHighPassFilter();
        }

        if (this._type === SELECTIVE) {
            this._materialOverride = this._createMaterialOverride();
            this._materialInstanceOverride = this._createMaterialIntanceOverride();
        }

        if (this._type === TEXTURE) {
            this._materialTexture = this._createMaterialTexture();
        }

        // Pass settings
        this.enabled = true;
        this.needsSwap = false;
    }

    dispose() {
        for (let i = 0; i < this.horizontal.length; i++) {
            this._renderTargetsBlur.horizontal[i].dispose();
        }

        for (let i = 0; i < this.vertical.length; i++) {
            this._renderTargetsBlur.vertical[i].dispose();
        }

        this._renderTargetBright.dispose();
    }

    /**
     * Getters & Setters
     */
    get strength() {
        return this._strength;
    }

    set strength(value) {
        this._strength = value;
        this._compositeMaterial.uniforms.bloomStrength.value = value;
    }

    get radius() {
        return this._radius;
    }

    set radius(value) {
        this._radius = value;
        this._compositeMaterial.uniforms.bloomRadius.value = value;
    }

    get threshold() {
        return this._threshold;
    }

    set threshold(value) {
        this._threshold = value;
        this._materialHighPassFilter.uniforms.luminosityThreshold.value = this._threshold;
    }

    get smoothWidth() {
        return this._smoothWidth;
    }

    set smoothWidth(value) {
        this._smoothWidth = value;
        this._materialHighPassFilter.uniforms.smoothWidth.value = this._smoothWidth;
    }

    get renderTargetBright() {
        return this._renderTargetBright;
    }

    get renderTargetsBlur() {
        return this._renderTargetsBlur;
    }

    get camera() {
        return this._camera;
    }

    set camera(value) {
        this._camera = value;
    }

    get scene() {
        return this._scene;
    }

    set scene(value) {
        this._scene = value;
    }

    get texture() {
        return this._texture;
    }

    set texture(value) {
        this._texture = value;
    }

    /**
     * Private
     */
    _createRenderTargetBright() {
        const renderTarget = new WebGLRenderTarget(0, 0, {
            // type: HalfFloatType,
        });
        renderTarget.texture.name = 'CustomUnrealBloomPass.bright';
        renderTarget.texture.minFilter = LinearFilter;
        renderTarget.texture.magFilter = LinearFilter;
        renderTarget.texture.format = RGBAFormat;
        renderTarget.texture.generateMipmaps = false;
        return renderTarget;
    }

    _createRenderTargetsBlur() {
        const horizontal = [];
        const vertical = [];

        const pars = {
            minFilter: LinearFilter,
            magFilter: LinearFilter,
            format: RGBAFormat,
            // type: HalfFloatType,
            generateMipmaps: false,
        };

        for (let i = 0; i < MIP_LEVELS; i++) {
            const renderTargetHorizonal = new WebGLRenderTarget(0, 0, pars);
            renderTargetHorizonal.texture.name = 'CustomUnrealBloomPass.h' + i;
            horizontal.push(renderTargetHorizonal);

            const renderTargetVertical = new WebGLRenderTarget(0, 0, pars);
            renderTargetVertical.texture.name = 'CustomUnrealBloomPass.v' + i;
            vertical.push(renderTargetVertical);
        }

        return {
            horizontal,
            vertical,
        };
    }

    _createMaterialHighPassFilter() {
        if (LuminosityHighPassShader === undefined) {
            console.error('THREE.CustomUnrealBloomPass relies on LuminosityHighPassShader');
        }

        const uniforms = UniformsUtils.clone(LuminosityHighPassShader.uniforms);
        uniforms.luminosityThreshold.value = this._threshold;
        uniforms.smoothWidth.value = this._smoothWidth;

        const material = new ShaderMaterial({
            uniforms,
            vertexShader: LuminosityHighPassShader.vertexShader,
            fragmentShader: LuminosityHighPassShader.fragmentShader,
        });

        return material;
    }

    _createSeparableBlurMaterials() {
        const separableBlurMaterials = [];
        const kernelSizeArray = [3, 5, 7, 9, 11];

        for (let i = 0; i < MIP_LEVELS; i++) {
            const kernelRadius = kernelSizeArray[i];
            const material = new ShaderMaterial({
                vertexShader: blurVertexShader,
                fragmentShader: blurFragmentShader,
                uniforms: {
                    colorTexture: { value: null },
                    texSize: { value: new Vector2(0.5, 0.5) },
                    direction: { value: new Vector2(0.5, 0.5) },
                },
                defines: {
                    KERNEL_RADIUS: kernelRadius,
                    SIGMA: kernelRadius,
                },
            });

            separableBlurMaterials.push(material);
        }

        return separableBlurMaterials;
    }

    _createCompositeMaterial() {
        const material = new ShaderMaterial({
            vertexShader: compositeVertexShader,
            fragmentShader: compositeFragmentShader,
            uniforms: {
                blurTexture1: { value: null },
                blurTexture2: { value: null },
                blurTexture3: { value: null },
                blurTexture4: { value: null },
                blurTexture5: { value: null },
                dirtTexture: { value: null },
                bloomStrength: { value: 1.0 },
                bloomFactors: { value: null },
                bloomTintColors: { value: null },
                bloomRadius: { value: 0.0 },
            },
            defines: {
                NUM_MIPS: MIP_LEVELS,
            },
        });
        material.uniforms.blurTexture1.value = this._renderTargetsBlur.vertical[0].texture;
        material.uniforms.blurTexture2.value = this._renderTargetsBlur.vertical[1].texture;
        material.uniforms.blurTexture3.value = this._renderTargetsBlur.vertical[2].texture;
        material.uniforms.blurTexture4.value = this._renderTargetsBlur.vertical[3].texture;
        material.uniforms.blurTexture5.value = this._renderTargetsBlur.vertical[4].texture;
        material.uniforms.bloomStrength.value = this._strength;
        material.uniforms.bloomRadius.value = this._radius;
        material.needsUpdate = true;

        const bloomFactors = [1.0, 0.8, 0.6, 0.4, 0.2];
        material.uniforms.bloomFactors.value = bloomFactors;
        const bloomTintColors = [new Vector3(1, 1, 1), new Vector3(1, 1, 1), new Vector3(1, 1, 1), new Vector3(1, 1, 1), new Vector3(1, 1, 1)];
        material.uniforms.bloomTintColors.value = bloomTintColors;

        return material;
    }

    _createMaterialCopy() {
        if (CopyShader === undefined) {
            console.error('THREE.CustomUnrealBloomPass relies on CopyShader');
        }

        const uniforms = UniformsUtils.clone(CopyShader.uniforms);
        uniforms.opacity.value = 1.0;

        const material = new ShaderMaterial({
            uniforms,
            vertexShader: CopyShader.vertexShader,
            fragmentShader: CopyShader.fragmentShader,
            blending: AdditiveBlending,
            depthTest: false,
            depthWrite: false,
            transparent: true,
        });

        return material;
    }

    _createBasicMaterial() {
        const material = new MeshBasicMaterial();
        return material;
    }

    _createFullscreenQuad() {
        const quad = new FullScreenQuad(null);
        return quad;
    }

    _createMaterialOverride() {
        const material = new MeshBasicMaterial({
            color: 0x000000,
            transparent: false,
        });

        return material;
    }

    _createMaterialIntanceOverride() {
        const material = new ShaderMaterial({
            vertexShader: `
                #ifdef USE_INSTANCING
                    attribute mat4 instanceMatrix;
                #endif
                
                void main() {
                    vec4 mvPosition = vec4(position, 1.0);
                    
                    #ifdef USE_INSTANCING
                        mvPosition = instanceMatrix * mvPosition;
                    #endif
                    
                    mvPosition = modelViewMatrix * mvPosition;
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                void main() {
                    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
                }
            `,
            transparent: false,
            depthTest: true,
            depthWrite: true,
            defines: {
                USE_INSTANCING: ''
            }
        });
        return material;
    }

    _createMaterialTexture() {
        const material = new ShaderMaterial({
            uniforms: {
                uTexture: { value: this._texture },
            },
            vertexShader: textureVertexShader,
            fragmentShader: textureFragmentShader,
        });
        return material;
    }

    /**
     * Render
     */
    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
        renderer.getClearColor(this._oldClearColor);
        this._oldClearAlpha = renderer.getClearAlpha();
        const oldAutoClear = renderer.autoClear;
        renderer.autoClear = false;

        renderer.setClearColor(this._clearColor, 0);
        if (maskActive) renderer.state.buffers.stencil.setTest(false);

        // Render input to screen
        this._renderInput(renderer, readBuffer);

        // Extract Bright Areas
        if (this._type === LUMINOSITY) {
            this._renderBright(renderer, readBuffer);
        }

        if (this._type === SELECTIVE) {
            this._renderSelective(renderer);
        }

        if (this._type === TEXTURE) {
            this._renderTexture(renderer);
        }

        // Blur All the mips progressively
        this._renderBlur(renderer);

        // Composite All the mips
        this._renderComposite(renderer);

        // Blend it additively over the input texture
        this._renderOutput(renderer, readBuffer, maskActive);

        // Restore renderer settings
        renderer.setClearColor(this._oldClearColor, this._oldClearAlpha);
        renderer.autoClear = oldAutoClear;
    }

    _renderInput(renderer, readBuffer) {
        if (!this.renderToScreen) return;

        this._fullscreenQuad.material = this._basicMaterial;
        this._basicMaterial.map = readBuffer.texture;

        renderer.setRenderTarget(null);
        // renderer.clear();
        this._fullscreenQuad.render(renderer);
    }

    _renderBright(renderer, readBuffer) {
        this._materialHighPassFilter.uniforms.tDiffuse.value = readBuffer.texture;
        this._materialHighPassFilter.uniforms.luminosityThreshold.value = this._threshold;
        this._materialHighPassFilter.uniforms.smoothWidth.value = this._smoothWidth;
        this._fullscreenQuad.material = this._materialHighPassFilter;

        renderer.setRenderTarget(this._renderTargetBright);
        renderer.setScissor(0, 0, this._width / this._dpr, this._height / this._dpr);
        // renderer.clear();
        renderer.setScissor(this._renderTargetBright.scissor);
        this._fullscreenQuad.render(renderer);
    }

    _renderSelective(renderer) {
        renderer.setRenderTarget(this._renderTargetBright);
        renderer.setScissor(0, 0, this._width / this._dpr, this._height / this._dpr);
        renderer.clear();
        renderer.setScissor(this._renderTargetBright.scissor);

        this._scene.traverse((object) => {
            // Skip control objects and other non-renderable objects
            if (this._shouldSkipObject(object)) {
                return;
            }

            if (object.type === 'Mesh' || object.type === 'SkinnedMesh' || object.type === 'Points') {
                if (object.userData && typeof object.userData.renderBloom !== 'undefined' && object.visible) {
                    object.userData.originalVisibilityState = object.visible;
                    object.visible = object.userData.renderBloom;
                    if (object.userData.bloomMaterial) {
                        object.userData.originalMaterial = object.material;
                        object.material = object.userData.bloomMaterial;
                    }
                } else if (object.visible) {
                    object.userData.material = object.material;

                    object.userData.originalVisibilityState = true;

                    if (object.instanceMatrix) {
                        object.material = this._materialInstanceOverride;
                    } else {
                        object.material = this._materialOverride;
                    }

                    object.userData.invisibleForBloom = true;
                }
            }
        });

        renderer.render(this._scene, this._camera);

        this._scene.traverse((object) => {
            // Skip control objects and other non-renderable objects
            if (this._shouldSkipObject(object)) {
                return;
            }

            if (object.type === 'Mesh' || object.type === 'SkinnedMesh' || object.type === 'Points') {
                if (object.userData) {
                    if (object.userData.originalVisibilityState) {
                        object.visible = object.userData.originalVisibilityState;
                        object.userData.originalVisibilityState = null;
                    }

                    if (object.userData.invisibleForBloom) {
                        object.material = object.userData.material;
                        object.userData.invisibleForBloom = false;
                    }

                    if (object.userData.bloomMaterial) {
                        object.material = object.userData.originalMaterial;
                    }
                }
            }
        });
    }

    _shouldSkipObject(object) {
        // Skip TransformControls and related objects
        if (object.constructor.name.includes('TransformControls') || object.constructor.name.includes('Bone')) {
            return true;
        }

        // Skip objects with isHelper flag (common for debug objects)
        if (object.isHelper) {
            return true;
        }

        // Skip objects marked as debug or control objects
        if (object.userData && (object.userData.isDebugObject || object.userData.isControlObject)) {
            return true;
        }

        // Skip lights (they shouldn't be processed as meshes)
        if (object.isLight) {
            return true;
        }

        // Skip cameras
        if (object.isCamera) {
            return true;
        }

        return false;
    }

    _renderTexture(renderer) {
        this._fullscreenQuad.material = this._materialTexture;

        renderer.setRenderTarget(this._renderTargetBright);
        renderer.setScissor(0, 0, this._width / this._dpr, this._height / this._dpr);
        // renderer.clear();
        renderer.setScissor(this._renderTargetBright.scissor);
        this._fullscreenQuad.render(renderer);
    }

    _renderBlur(renderer) {
        let inputRenderTarget = this._renderTargetBright;

        for (let i = 0; i < MIP_LEVELS; i++) {
            this._fullscreenQuad.material = this._separableBlurMaterials[i];

            this._separableBlurMaterials[i].uniforms.colorTexture.value = inputRenderTarget.texture;
            this._separableBlurMaterials[i].uniforms.direction.value = BLUR_DIRECTION_X;

            renderer.setRenderTarget(this._renderTargetsBlur.horizontal[i]);
            renderer.setScissor(0, 0, this._width / this._dpr, this._height / this._dpr);
            // renderer.clear();
            renderer.setScissor(this._renderTargetsBlur.horizontal[i].scissor);
            this._fullscreenQuad.render(renderer);

            this._separableBlurMaterials[i].uniforms.colorTexture.value = this._renderTargetsBlur.horizontal[i].texture;
            this._separableBlurMaterials[i].uniforms.direction.value = BLUR_DIRECTION_Y;
            renderer.setRenderTarget(this._renderTargetsBlur.vertical[i]);
            renderer.setScissor(0, 0, this._width / this._dpr, this._height / this._dpr);
            // renderer.clear();
            renderer.setScissor(this._renderTargetsBlur.vertical[i].scissor);
            this._fullscreenQuad.render(renderer);

            inputRenderTarget = this._renderTargetsBlur.vertical[i];
        }
    }

    _renderComposite(renderer) {
        this._fullscreenQuad.material = this._compositeMaterial;

        this._compositeMaterial.uniforms.bloomStrength.value = this._strength;
        this._compositeMaterial.uniforms.bloomRadius.value = this._radius;

        renderer.setRenderTarget(this._renderTargetsBlur.horizontal[0]);
        renderer.setScissor(0, 0, this._width / this._dpr, this._height / this._dpr);
        // renderer.clear();
        renderer.setScissor(this._renderTargetsBlur.horizontal[0].scissor);
        this._fullscreenQuad.render(renderer);
    }

    _renderOutput(renderer, readBuffer, maskActive) {
        this._fullscreenQuad.material = this._materialCopy;

        this._materialCopy.uniforms.tDiffuse.value = this._renderTargetsBlur.horizontal[0].texture;

        if (maskActive) renderer.state.buffers.stencil.setTest(true);

        if (this.renderToScreen) {
            renderer.setRenderTarget(null);
            this._fullscreenQuad.render(renderer);
        } else {
            renderer.setRenderTarget(readBuffer);
            this._fullscreenQuad.render(renderer);
        }
    }

    /**
     * Resize
     */
    setSize(width, height) {
        this._width = width;
        this._height = height;

        const scale = 0.4; // TODO: add to settings ?
        let resx = Math.round(width * scale);
        let resy = Math.round(height * scale);

        this._renderTargetBright.setSize(resx, resy);

        for (let i = 0; i < MIP_LEVELS; i++) {
            this._renderTargetsBlur.horizontal[i].setSize(resx, resy);
            this._renderTargetsBlur.vertical[i].setSize(resx, resy);
            this._separableBlurMaterials[i].uniforms.texSize.value = new Vector2(resx, resy);

            resx = Math.round(resx / 2);
            resy = Math.round(resy / 2);
        }
    }
}

export { CustomUnrealBloomPass, SELECTIVE, LUMINOSITY, TEXTURE };
