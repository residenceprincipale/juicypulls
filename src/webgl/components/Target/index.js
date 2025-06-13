import Experience from 'core/Experience.js'
import {
    PlaneGeometry,
    Mesh,
    MeshBasicMaterial,
    Vector3,
    TextureLoader,
    DoubleSide,
    Box3,
    Vector2,
    ShaderMaterial,
    Object3D
} from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'
import addTransformDebug from '@/webgl/utils/addTransformDebug'
import faceVertexShader from './shaders/vertex.glsl'
import faceFragmentShader from './shaders/fragment.glsl'

export default class Target {
    constructor(position = new Vector3(-2.661, -0.897, -12.000)) {
        this._experience = new Experience()
        this._scene = this._experience.scene
        this._debug = this._experience.debug
        this._time = this._experience.time
        this._resources = this._scene.resources
        this._texture = this._resources.items.gunTarget
        this._textureFaces = this._resources.items.gunTargetFaces
        this._modelPaperFaces = this._resources.items.gunTargetPaperModel

        this._initialPosition = position.clone()
        this._isAnimating = false
        this._isVisible = false
        this._intendedScale = 1 // Store the intended scale for animations

        this._createContainer()
        this._createGeometry()
        this._createMaterial()
        this._createMesh()
        this._createFaceMesh()
        this._setupBoundingBox()

        // if (this._debug.active) this._createDebug()
    }

    /**
     * Getters & Setters
     */
    get mesh() {
        return this._container
    }

    get position() {
        return this._container.position
    }

    get isVisible() {
        return this._isVisible
    }

    set isVisible(value) {
        this._isVisible = value
        // this._container.visible = value
    }

    get isAnimating() {
        return this._isAnimating
    }

    get boundingBox() {
        return this._boundingBox
    }

    /**
     * Public Methods
     */
    setPosition(x, y, z) {
        this._container.position.set(x, y, z)
        this._updateBoundingBox()
        console.log('Target position set to', x, y, z)
    }

    setScale(scale) {
        this._intendedScale = scale
        this._container.scale.set(scale, scale, scale)

        // Also update face mesh scale if it exists
        if (this._faceMesh) {
            this._faceMesh.scale.set(scale * 1.5, scale * 1.5, scale * 1.5)
        }

        this._updateBoundingBox()
    }

    animateIn(duration = 0.8, delay = 0) {
        if (this._isAnimating) return Promise.resolve()

        this._isAnimating = true
        this._isVisible = true

        // Start with target folded down (rotated -90 degrees around X axis so it folds down from bottom)
        this._container.rotation.x = -Math.PI / 2
        this._container.visible = true

        return new Promise((resolve) => {
            this._animateInTimeline?.kill()
            this._animateInTimeline = gsap.timeline({
                delay,
                onComplete: () => {
                    this._isAnimating = false
                    resolve()
                }
            })

            // Animate rotation to upright position with a slight bounce
            this._animateInTimeline.to(this._container.rotation, {
                x: 0,
                duration,
                ease: "back.out(1.7)"
            })

            // Add a subtle scale animation for more impact
            this._animateInTimeline.fromTo(this._container.scale,
                { x: 0.1 * this._intendedScale, y: 0.1 * this._intendedScale, z: 0.1 * this._intendedScale },
                {
                    x: this._intendedScale,
                    y: this._intendedScale,
                    z: this._intendedScale,
                    duration: duration * 0.6,
                    ease: "back.out(2)"
                }, 0)
        })
    }

    animateOut(duration = 0.5, delay = 0) {

        this._isAnimating = true

        return new Promise((resolve) => {
            this._animateOutTimeline?.kill()
            this._animateOutTimeline = gsap.timeline({
                delay,
                onComplete: () => {
                    this._isAnimating = false
                    this._isVisible = false
                    this._container.visible = false
                    resolve()
                }
            })

            // Animate rotation to folded down position (fold down from bottom)
            this._animateOutTimeline.to(this._container.rotation, {
                x: -Math.PI / 2,
                duration,
                ease: "power2.in"
            })

            // Scale down slightly as it folds
            this._animateOutTimeline.to(this._container.scale, {
                x: 0.8 * this._intendedScale,
                y: 0.8 * this._intendedScale,
                z: 0.8 * this._intendedScale,
                duration: duration * 0.7,
                ease: "power2.in"
            }, 0)
        })
    }

    // Method for hit animation when shot
    animateHit() {
        if (this._isAnimating) return

        this._hitTimeline?.kill()
        this._hitTimeline = gsap.timeline()

        // Quick shake and flash effect
        this._hitTimeline.to(this._container.position, {
            x: this._container.position.x + 0.1,
            duration: 0.05,
            yoyo: true,
            repeat: 3,
            ease: "power2.inOut"
        })

        // Flash the material
        const originalOpacity = this._material.opacity
        this._hitTimeline.to(this._material, {
            opacity: 0.3,
            duration: 0.1,
            yoyo: true,
            repeat: 1,
            ease: "power2.inOut"
        }, 0)
    }

    // Reset target to initial state
    reset() {
        this._animateInTimeline?.kill()
        this._animateOutTimeline?.kill()
        this._hitTimeline?.kill()

        this._container.position.copy(this._initialPosition)
        this._container.rotation.set(0, 0, 0)
        this._container.scale.set(this._intendedScale, this._intendedScale, this._intendedScale)
        this._material.opacity = 1
        this._container.visible = false
        this._isVisible = false
        this._isAnimating = false

        // Randomize face visibility for next appearance (3 out of 5 chances)
        if (this._faceMesh) {
            this._showFace = Math.random() < (3 / 5)
            this._faceMesh.visible = this._showFace

            // Also randomize which face texture and rotation
            if (this._faceMaterial) {
                this._faceMaterial.uniforms.uFaceIndex.value = Math.floor(Math.random() * 9)
            }
            this._faceMesh.rotation.z = (Math.random() - 0.5) * 2 * 0.5
            // Update face mesh scale to match target scale
            this._faceMesh.scale.set(this._intendedScale, this._intendedScale, this._intendedScale)
        }

        this._updateBoundingBox()
    }

    // Check if a point (like a bullet) intersects with the target
    checkHit(point) {
        if (!this._isVisible || this._isAnimating) return false

        this._updateBoundingBox()
        return this._boundingBox.containsPoint(point)
    }

    update() {
        // Update method for any per-frame updates if needed
        this._updateBoundingBox()
    }

    dispose() {
        this._animateInTimeline?.kill()
        this._animateOutTimeline?.kill()
        this._hitTimeline?.kill()

        // Remove face mesh if it exists
        if (this._faceMesh) {
            this._container.remove(this._faceMesh)
            this._faceMesh = null
        }

        // Dispose face material
        if (this._faceMaterial) {
            this._faceMaterial.dispose()
            this._faceMaterial = null
        }

        this._scene.remove(this._container)
        this._geometry.dispose()
        this._material.dispose()

        if (this._texture) {
            this._texture.dispose()
        }
    }

    /**
     * Private Methods
     */
    _createContainer() {
        // Create the main container that will hold both target and face mesh
        this._container = new Object3D()
        this._container.position.copy(this._initialPosition)
        this._container.scale.set(1.5, 1.5, 1.5)
        this._container.name = 'target-container'

        // Start hidden and folded down from bottom
        this._container.visible = false
        this._container.rotation.x = Math.PI / 2

        this._scene.add(this._container)
    }

    _createGeometry() {
        // Create a plane geometry for the target (human silhouette size)
        this._geometry = new PlaneGeometry(0.8, 1.4, 1, 1)

        // Move the geometry so the origin is at the bottom center instead of the center
        // This makes it rotate around the bottom edge like a real shooting range target
        this._geometry.translate(0, 0.75, 0) // Half the height (1.5 / 2 = 0.75)
    }

    _createMaterial() {
        // Load the target texture
        this._material = new MeshBasicMaterial({
            map: this._texture,
            transparent: true,
            // alphaTest: 0.1
        })
    }

    _createMesh() {
        this._mesh = new Mesh(this._geometry, this._material)
        this._mesh.position.set(0, 0, 0) // Position relative to container
        this._mesh.name = 'target'

        // Add to container instead of scene
        this._container.add(this._mesh)
    }

    _createFaceMesh() {
        if (!this._modelPaperFaces) {
            console.warn('gunTargetPaperModel not found in resources')
            return
        }

        // Clone the model to avoid modifying the original
        this._faceMesh = this._modelPaperFaces.scene.clone()

        // Create custom face material with shader
        this._faceMaterial = new ShaderMaterial({
            uniforms: {
                uFaceTexture: { value: this._textureFaces },
                uFaceIndex: { value: Math.floor(Math.random() * 9) }, // Random face (0-8)
                uOpacity: { value: 1.0 }
            },
            vertexShader: faceVertexShader,
            fragmentShader: faceFragmentShader,
            transparent: true
        })

        // Apply the custom material to all meshes in the face model
        this._faceMesh.traverse((child) => {
            if (child.isMesh) {
                child.material = this._faceMaterial
            }
        })

        // Random visibility (3 out of 5 chances)
        this._showFace = Math.random() < (3 / 5)
        this._faceMesh.visible = this._showFace

        // Position the face mesh on top of the target (relative to container)
        this._faceMesh.position.set(0, 1.3, 0.01) // Slightly in front to avoid z-fighting
        this._faceMesh.rotation.z = (Math.random() - 0.5) * 2 * 0.5
        this._faceMesh.scale.set(this._intendedScale, this._intendedScale, this._intendedScale) // Apply target scale

        // Add to container so it moves with target
        this._container.add(this._faceMesh)
    }

    _setupBoundingBox() {
        this._boundingBox = new Box3()
        this._updateBoundingBox()
    }

    _updateBoundingBox() {
        if (this._container && this._isVisible) {
            this._boundingBox.setFromObject(this._container)
        }
    }

    _createDebug() {
        if (!this._debug.active) return

        const debugFolder = this._debug.ui.addFolder({
            title: 'Target',
            expanded: true,
        })

        // Transform controls
        addTransformDebug(debugFolder, this._container)

        // Target specific controls
        debugFolder.addButton({
            title: 'Animate In'
        }).on('click', () => {
            this.animateIn()
        })

        debugFolder.addButton({
            title: 'Animate Out'
        }).on('click', () => {
            this.animateOut()
        })

        debugFolder.addButton({
            title: 'Hit Animation'
        }).on('click', () => {
            this.animateHit()
        })

        debugFolder.addButton({
            title: 'Reset'
        }).on('click', () => {
            this.reset()
        })
    }
} 