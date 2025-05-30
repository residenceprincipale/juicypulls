import Experience from 'core/Experience.js'
import {
    PlaneGeometry,
    Mesh,
    MeshBasicMaterial,
    Vector3,
    TextureLoader,
    DoubleSide,
    Box3,
    Vector2
} from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'
import addTransformDebug from '@/webgl/utils/addTransformDebug'

export default class Target {
    constructor(position = new Vector3(-2.661, -0.897, -12.000)) {
        this._experience = new Experience()
        this._scene = this._experience.scene
        this._debug = this._experience.debug
        this._time = this._experience.time
        this._resources = this._scene.resources
        this._texture = this._resources.items.gunTarget

        this._initialPosition = position.clone()
        this._isAnimating = false
        this._isVisible = false

        this._createGeometry()
        this._createMaterial()
        this._createMesh()
        this._setupBoundingBox()

        // if (this._debug.active) this._createDebug()
    }

    /**
     * Getters & Setters
     */
    get mesh() {
        return this._mesh
    }

    get position() {
        return this._mesh.position
    }

    get isVisible() {
        return this._isVisible
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
        this._mesh.position.set(x, y, z)
        this._updateBoundingBox()
    }

    animateIn(duration = 0.8, delay = 0) {
        if (this._isAnimating) return Promise.resolve()

        this._isAnimating = true
        this._isVisible = true

        // Start with target folded down (rotated -90 degrees around X axis so it folds down from bottom)
        this._mesh.rotation.x = -Math.PI / 2
        this._mesh.visible = true

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
            this._animateInTimeline.to(this._mesh.rotation, {
                x: 0,
                duration,
                ease: "back.out(1.7)"
            })

            // Add a subtle scale animation for more impact
            this._animateInTimeline.fromTo(this._mesh.scale,
                { x: 0.1, y: 0.1, z: 0.1 },
                {
                    x: 1,
                    y: 1,
                    z: 1,
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
                    this._mesh.visible = false
                    resolve()
                }
            })

            // Animate rotation to folded down position (fold down from bottom)
            this._animateOutTimeline.to(this._mesh.rotation, {
                x: -Math.PI / 2,
                duration,
                ease: "power2.in"
            })

            // Scale down slightly as it folds
            this._animateOutTimeline.to(this._mesh.scale, {
                x: 0.8,
                y: 0.8,
                z: 0.8,
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
        this._hitTimeline.to(this._mesh.position, {
            x: this._mesh.position.x + 0.1,
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

        this._mesh.position.copy(this._initialPosition)
        this._mesh.rotation.set(0, 0, 0)
        this._mesh.scale.set(1, 1, 1)
        this._material.opacity = 1
        this._mesh.visible = false
        this._isVisible = false
        this._isAnimating = false

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

        this._scene.remove(this._mesh)
        this._geometry.dispose()
        this._material.dispose()

        if (this._texture) {
            this._texture.dispose()
        }
    }

    /**
     * Private Methods
     */
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
        this._mesh.position.copy(this._initialPosition)
        this._mesh.name = 'target'

        // Start hidden and folded down from bottom
        this._mesh.visible = false
        this._mesh.rotation.x = Math.PI / 2

        this._scene.add(this._mesh)
    }

    _setupBoundingBox() {
        this._boundingBox = new Box3()
        this._updateBoundingBox()
    }

    _updateBoundingBox() {
        if (this._mesh && this._isVisible) {
            this._boundingBox.setFromObject(this._mesh)
        }
    }

    _createDebug() {
        if (!this._debug.active) return

        const debugFolder = this._debug.ui.addFolder({
            title: 'Target',
            expanded: true,
        })

        // Transform controls
        addTransformDebug(debugFolder, this._mesh)

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