import Experience from 'core/Experience.js'
import sampleVertexShader from './shaders/vertex.glsl'
import sampleFragmentShader from './shaders/fragment.glsl'
import {
    BoxGeometry,
    Mesh,
    ShaderMaterial,
    Vector3,
    MeshBasicMaterial,
    Vector2,
    RepeatWrapping,
    MeshMatcapMaterial,
    Color,
    MeshStandardMaterial,
    DirectionalLight,
    MeshPhongMaterial,
    DirectionalLightHelper,
} from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'
import addMaterialDebug from '@/webgl/utils/addMaterialDebug'
import addCustomMaterialDebug from '@/webgl/utils/addCustomMaterialDebug'
import addTransformDebug from '@/webgl/utils/addTransformDebug'
import { PhongCustomMaterial } from '@/webgl/materials/PhongMaterial'

import sampleMaterialUniforms from './settings.js'

export default class BackgroundEnvironment {
    constructor() {
        this._experience = new Experience()
        this._scene = this._experience.scene
        this._debug = this._experience.debug
        this._resources = this._scene.resources
        this._resource = this._resources.items.environmentModel

        this._createMaterial()
        this._createModel()
        this._createEventListeners()

        if (this._debug.active) this._createDebug()
    }

    /**
     * Getters & Setters
     */
    get model() {
        return this._model
    }

    get material() {
        return this._material
    }

    /**
     * Private
     */

    _createModel() {
        // If you have a specific model resource, use it
        // this._model = this._resource.scene

        // For demo purposes, use the created mesh as the model
        this._model = this._resource.scene
        this._model.name = 'background environment'
        this._model.position.set(4.114, -1.468, -2.099)
        this._model.scale.set(2.094, 2.094, 2.094)
        this._model.rotation.set(-3.142, 1.512, -3.142)

        this._scene.add(this._model)

        // If using a loaded model, traverse and apply materials
        // this._model.traverse((child) => {
        //     if (!child.isMesh) return
        //     if (child.name.includes('sample-part')) {
        //         child.material = this._material
        //     }
        // })
    }

    _createMaterial() {
        this._material = new PhongCustomMaterial({
            vertexShader: sampleVertexShader,
            fragmentShader: sampleFragmentShader,
            uniforms: sampleMaterialUniforms,
            name: 'Sample Material',
            defines: {
                USE_ROUGHNESS: true,
                USE_MATCAP: true,
            },
        })
    }

    _createEventListeners() {
        // Add event listeners here if needed
    }

    _createDebug() {
        if (!this._debug.active) return

        const debugFolder = this._debug.ui.addFolder({
            title: 'Background Environment',
            expanded: true,
        })

        // Material debug
        addCustomMaterialDebug(debugFolder, sampleMaterialUniforms, this._resources, this._material)

        // Transform controls for the model
        addTransformDebug(debugFolder, this._model)
    }
} 