import Experience from 'core/Experience.js'
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
    Object3D,
} from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'
import addMaterialDebug from '@/webgl/utils/addMaterialDebug'
import addCustomMaterialDebug from '@/webgl/utils/addCustomMaterialDebug'
import addTransformDebug from '@/webgl/utils/addTransformDebug'
import { PhongCustomMaterial } from '@/webgl/materials/PhongMaterial'
import AnimationController from 'utils/AnimationController.js'

import sampleMaterialUniforms from './armMaterialSettings.js'
import gunMaterialUniforms from './gunMaterialSettings.js'

export default class Gun {
    constructor() {
        this._experience = new Experience()
        this._scene = this._experience.scene
        this._debug = this._experience.debug
        this._resources = this._scene.resources
        this._resource = this._resources.items.gunArmModel
        this._time = this._experience.time

        this._createMaterial()
        this._createBerettaMaterial()
        this._createParentObject()
        this._createModel()
        this._createAnimations()
        this._createEventListeners()
        this._startBreathingAnimation()

        this.animateGunOut()

        if (this._debug.active) this._createDebug()
    }

    /**
     * Getters & Setters
     */
    get model() {
        return this._model
    }

    get parentObject() {
        return this._parentObject
    }

    get material() {
        return this._material
    }

    get animation() {
        return this._animation
    }

    /**
     * Public Methods
     */
    update() {
        if (this._animation) {
            this._animation.update(this._time.delta * 0.001)
        }
    }

    shoot() {
        if (this._animation) {
            this._animation.playAnimation('SHOOT')
        }
    }

    animateGunIn() {
        this._gunInTimeline?.kill()
        this._gunInTimeline = gsap.timeline()
        this._gunInTimeline.fromTo(this._model.rotation, {
            x: -2.142, // Hidden position
        }, {
            x: 0, // Normal position relative to parent
            duration: 0.8,
            ease: "back.out(1.7)"
        })

        console.log('Gun in animation started')
    }

    animateGunOut() {
        // stop breathing animation
        this._breathingTimelineY?.kill()
        this._breathingTimelineX?.kill()

        this._gunOutTimeline?.kill()
        this._gunOutTimeline = gsap.timeline()
        this._gunOutTimeline.fromTo(this._model.rotation, {
            x: 0, // Normal position
        }, {
            x: -2.142, // Hidden position
            duration: 0.5,
            ease: "power2.in"
        })

        console.log('Gun out animation started')
    }

    dispose() {
        // Kill all animations
        this._gunInTimeline?.kill()
        this._gunOutTimeline?.kill()
        this._breathingTimelineY?.kill()
        this._breathingTimelineX?.kill()

        // Remove from scene
        if (this._parentObject) {
            this._scene.remove(this._parentObject)
        }
    }

    /**
     * Private
     */
    _createMaterial() {
        this._material = new PhongCustomMaterial({
            uniforms: sampleMaterialUniforms,
            name: 'Arm Material',
            defines: {
                USE_ROUGHNESS: true,
                USE_ALBEDO: true,
            },
        })
    }

    _createBerettaMaterial() {
        this._berettaMaterial = new PhongCustomMaterial({
            uniforms: gunMaterialUniforms,
            name: 'Gun Material',
            defines: {
                USE_ROUGHNESS: true,
                USE_ALBEDO: true,
                USE_AO: true,
            },
        })
    }

    _createParentObject() {
        this._parentObject = new Object3D()
        this._parentObject.name = 'gun-parent'
        this._parentObject.position.set(0.651, -0.103, 0.000)
        this._parentObject.scale.set(2, 2, 2)
        this._parentObject.rotation.set(3.142, -0.385, 3.142)
        this._scene.add(this._parentObject)
    }

    _createModel() {
        // If you have a specific model resource, use it
        // this._model = this._resource.scene

        // For demo purposes, use the created mesh as the model
        this._model = this._resource.scene
        console.log(this._resource)
        this._model.name = 'gun arm'

        // Reset model position since parent handles positioning
        this._model.position.set(0, 0, 0)
        this._model.scale.set(1, 1, 1)
        this._model.rotation.set(0, 0, 0)
        // Start in normal position (not hidden)

        // TEMPORRAY: disable frustrum culling
        this._model.traverse((child) => {
            if (child.isMesh) {
                child.frustumCulled = false
            }
        })

        this._parentObject.add(this._model)

        this._model.traverse((child) => {
            if (child.isMesh) {
                if (child.name.includes('skin')) child.material = this._material
                else child.material = this._berettaMaterial
            }
        })
    }

    _createAnimations() {
        // Check if the resource has animations
        if (this._resource.animations && this._resource.animations.length > 0) {
            this._animation = new AnimationController({
                animations: this._resource.animations,
                model: this._resource.scene,
            })

            console.log('Gun animations available:', this._resource.animations.map(anim => anim.name))

        } else {
            console.log('No animations found in gun resource')
        }

        this._animation.setAnimationProgress('SHOOT', 0)
    }

    _createEventListeners() {
        // Add event listeners here if needed
    }

    _startBreathingAnimation() {
        // Kill any existing breathing animation
        this._breathingTimelineY?.kill()
        this._breathingTimelineX?.kill()

        // Create a simple looping breathing animation
        const breathingIntensity = 0.007 // How much the gun moves
        const breathingSpeed = 2 // Duration of one breath cycle in seconds

        // Vertical breathing movement (continuous loop)
        this._breathingTimelineY = gsap.to(this._model.position, {
            y: breathingIntensity,
            duration: breathingSpeed / 2,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1
        })

        // Slight rotation breathing (continuous loop)
        const baseRotationX = this._model.rotation.x
        this._breathingTimelineX = gsap.to(this._model.rotation, {
            x: baseRotationX + 0.005,
            duration: breathingSpeed / 2,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1
        })
    }

    _createDebug() {
        if (!this._debug.active) return

        const debugFolder = this._debug.ui.addFolder({
            title: 'Gun Arm',
            expanded: true,
        })

        // Material debug
        addCustomMaterialDebug(debugFolder, sampleMaterialUniforms, this._resources, this._material)
        addCustomMaterialDebug(debugFolder, gunMaterialUniforms, this._resources, this._berettaMaterial)

        // Transform controls for the parent object (used by ShooterManager)
        const parentFolder = debugFolder.addFolder({
            title: 'Gun Parent (Aiming)',
            expanded: false
        })
        addTransformDebug(parentFolder, this._parentObject)

        // Transform controls for the model (breathing + gun in/out)
        const modelFolder = debugFolder.addFolder({
            title: 'Gun Model',
            expanded: false
        })
        addTransformDebug(modelFolder, this._model)

        // Breathing animation controls
        const breathingFolder = debugFolder.addFolder({
            title: 'Animations',
            expanded: false
        })

        breathingFolder.addButton({
            title: 'Gun In'
        }).on('click', () => {
            this.animateGunIn()
        })

        breathingFolder.addButton({
            title: 'Gun Out'
        }).on('click', () => {
            this.animateGunOut()
        })

        breathingFolder.addButton({
            title: 'Start Breathing'
        }).on('click', () => {
            this._startBreathingAnimation()
        })

        breathingFolder.addButton({
            title: 'Stop Breathing'
        }).on('click', () => {
            this._breathingTimelineY?.kill()
            this._breathingTimelineX?.kill()
        })

        // Animation debug controls
        if (this._animation) {
            this._animation.setDebug(debugFolder)
        }
    }
} 