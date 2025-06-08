import Experience from 'core/Experience.js'

import {
    BoxGeometry,
    PlaneGeometry,
    MeshBasicMaterial,
    Mesh,
} from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'
import addMaterialDebug from '@/webgl/utils/addMaterialDebug'
import addCustomMaterialDebug from '@/webgl/utils/addCustomMaterialDebug'
import addTransformDebug from '@/webgl/utils/addTransformDebug'
import settings from './settings.js'

import { PhongCustomMaterial } from '@/webgl/materials/PhongMaterial'

export default class Logo {
    constructor() {
        this._experience = new Experience()
        this._scene = this._experience.scene
        this._debug = this._experience.debug
        this._resources = this._scene.resources
        this._resource = this._resources.items.rouletteModel

        this._createMaterial()
        // this._createBackgroundMesh()
        this._createModel()
        this._createEventListeners()

        this._animateSpin()

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
     * Public
     */
    show() {
        this._model.visible = true
    }

    hide() {
        // this._model.visible = false

        // opacity zero immediately then rotate to face the cam and flash two times before hiding (in a timeline)
        const timeline = gsap.timeline()

        timeline.to(this._material.uniforms.uOpacity, {
            value: 0,
            duration: 0,
        })

        gsap.killTweensOf(this._model.rotation)
        timeline.to(this._model.rotation, {
            z: 0,
            duration: 0,
            ease: "power2.out",
        }, 0.5)

        timeline.to(this._material.uniforms.uOpacity, {
            value: 1,
            duration: 0.2,
            ease: "steps(1)",
            repeat: 2,
            yoyo: true,
        })

        timeline.to(this._material.uniforms.uOpacity, {
            value: 0,
            duration: 0,
        })
    }

    /**
     * Private
     */
    _createModel() {
        // Find the logo mesh in the resource
        let logoMesh = null;

        this._resource.scene.traverse((child) => {
            if (child.name.includes('logo')) {
                logoMesh = child;
            }
        });

        if (logoMesh) {
            console.log(logoMesh)
            this._model = logoMesh.clone();
            this._model.geometry = logoMesh.geometry.clone();
            this._model.material = this._material;
            this._model.position.set(0, 0, 0);
            this._model.rotation.set(1.600, 0.000, 0.000);
            this._model.scale.set(3, 3, 3);
            this._model.userData.renderBloom = true
            this._scene.add(this._model);
        } else {
            console.warn('Logo mesh not found in rouletteModel resource');
        }
    }

    _animateSpin() {
        gsap.to(this._model.rotation, {
            z: Math.PI * 2,
            duration: 10,
            ease: "linear",
            repeat: -1
        })
    }

    _createBackgroundMesh() {
        const material = new MeshBasicMaterial({
            color: 0xff0000,
        })
        const geometry = new PlaneGeometry(3, 2)
        // geometry.rotateX(-Math.PI / 2)
        this._backgroundMesh = new Mesh(geometry, material)
        this._backgroundMesh.position.set(0, 0, 0.2)
        this._scene.add(this._backgroundMesh)

        console.log(this._backgroundMesh)
    }

    _createMaterial() {
        this._material = new PhongCustomMaterial({
            uniforms: settings,
            name: 'Gold Logo Material',
            transparent: true,
            defines: {
                USE_ROUGHNESS: true,
                USE_MATCAP: true,
                USE_AO: true,
            },
        })
    }

    _createEventListeners() {

    }

    _createDebug() {
        if (!this._debug.active) return

        const debugFolder = this._debug.ui.addFolder({
            title: '3D Logo',
            expanded: true,
        })

        // Material debug
        addCustomMaterialDebug(debugFolder, settings, this._resources, this._material)

        // Transform controls for the model
        addTransformDebug(debugFolder, this._model)
    }
} 