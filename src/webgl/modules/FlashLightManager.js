import { MeshBasicMaterial } from 'three'
import { Mesh, Plane } from 'three'
import { Vector2 } from 'three'
import Experience from '../core/Experience'
import bus from 'core/EventBus.js'
import { Vector3 } from 'three'
import { PlaneGeometry } from 'three'
import addTransformDebug from '../utils/addTransformDebug'
import { MathUtils } from 'three'
import gsap from 'gsap'

// Pointer x (fraction of the window) that makes the player lean out to the casino, and that brings them back
const LOOK_ASIDE_EDGE = 0.96
const LOOK_BACK_EDGE = 0.06
// Time the pointer must rest on the edge, in ms
const EDGE_DWELL = 300
// Camera position of the side view (beside the machine, the torch in view), whatever the machine framing
const SIDE_VIEW_POSITION = new Vector3(1.36, 0.07, 1.24)

/**
 * Flashlight (replaces the CCTV of the installation): the player rests the pointer on the right edge to lean out
 * and look into the casino, then holds the pointer down to switch the torch on and aim it.
 * The left edge, or any machine input (lever, buttons, collect), brings them back to the machine.
 * Emits `look-aside {value}`. Off until `enabled` is set (the game sets it once the machine runs).
 */
export default class FlashlightManager {
	constructor(options = {}) {
		this._flashlightModel = options.flashlightModel
		this._light = options.light

		this._experience = new Experience()
		this._scene = this._experience.scene
		this._camera = this._experience.camera
		this._debug = this._experience.debug
		this._showDebugPlane = false
		this._raycaster = this._experience.interactionManager.raycaster

		this._breathingSettings = {
			amplitudeY: 0.75, // meters (vertical amplitude)
			speedY: 0.18, // breaths per second
			amplitudeX: 0.63, // meters (horizontal amplitude)
			speedX: 0.2, // oscillations per second
		}

		this._enabled = false
		this._isLookingAside = false
		this._isInSideView = false
		this._edgeTime = 0

		// The torch starts off. Intensity rather than visible: hiding the light changes the spot light count and
		// recompiles every lit material.
		this._isLightOn = false
		this._lightIntensity = this._light.intensity
		this._light.intensity = 0

		this._setupLightPosition()
		this._createEventListener()
		if (this._debug.active) this._createDebug()
	}

	/**
	 * Getters & Setters
	 */
	get enabled() {
		return this._enabled
	}

	set enabled(value) {
		this._enabled = value
		if (!value) this.lookAside(false)
	}

	get isLookingAside() {
		return this._isLookingAside
	}

	/**
	 * Public
	 */
	// Slides the camera to the side view on the casino (true) or back to the machine (false)
	lookAside(value) {
		if (this._isLookingAside === value) return
		this._isLookingAside = value
		this._isInSideView = false
		this._edgeTime = 0
		this.disableLight()

		const offset = value ? SIDE_VIEW_POSITION.clone().sub(this._camera.machineView.position) : new Vector3()
		this._cameraTween?.kill()
		this._cameraTween = gsap.to(this._camera.viewOffset, {
			x: offset.x,
			y: offset.y,
			z: offset.z,
			duration: 1,
			ease: 'power2.inOut',
			onUpdate: () => this._camera.applyView(),
			onComplete: () => {
				this._isInSideView = value
				// Already holding the pointer down when the camera arrives
				if (value && this._isPointerDown) this.enableLight()
			},
		})

		bus.emit('look-aside', { value })
	}

	enableLight() {
		if (this._isLightOn) return
		this._isLightOn = true

		this._intensityTween?.kill()
		this._intensityTween = gsap.to(this._light, { intensity: this._lightIntensity, duration: 0.15, ease: 'power1.in' })
	}

	disableLight() {
		if (!this._isLightOn) return
		this._isLightOn = false

		// Keeps an intensity changed from the debug panel
		if (!this._intensityTween?.isActive()) this._lightIntensity = this._light.intensity
		this._intensityTween?.kill()
		this._intensityTween = gsap.to(this._light, { intensity: 0, duration: 0.15, ease: 'power1.out' })
	}

	update(timeData) {
		this._elapsedTime = timeData.elapsedTime
		this._deltaTime = timeData.deltaTime

		this._updateEdgeLook(timeData.deltaTime)

		if (!this._isLightOn) return
		this._updateBreathingMovement(this._elapsedTime)
		this._updateLightPosition()
	}

	dispose() {
		this._unsubscribers?.forEach((unsubscribe) => unsubscribe())
		this._unsubscribers = null
		window.removeEventListener('pointermove', this._pointerMoveHandler)
		window.removeEventListener('pointerdown', this._pointerDownHandler)
		window.removeEventListener('pointerup', this._pointerUpHandler)
		window.removeEventListener('pointercancel', this._pointerUpHandler)
		this._cameraTween?.kill()
		this._intensityTween?.kill()
	}

	//Private
	_setupLightPosition() {
		this._mouseVector2 = new Vector2()

		this._prevMouseRaw = { x: 0, y: 0 }

		this._plane = new Plane(new Vector3(0, 0, 1), 20) // normal and distance from the origin
		this._planePosition = new Vector3(1, 0, 20)

		this._intersectionResult = new Vector3()

		this._light.position.copy(this._flashlightModel._model.position)

		if (this._showDebugPlane) {
			this._planeGeometry = new PlaneGeometry(4, 4)
			this._planeMaterial = new MeshBasicMaterial({ color: 0x00ff00 })
			this._debugPlaneMesh = new Mesh(this._planeGeometry, this._planeMaterial)
			this._debugPlaneMesh.name = 'Debug plane'
			this._scene.add(this._debugPlaneMesh)
			// this._debugPlaneMesh.position.copy(this._flashlightModel._model.position)
			this._debugPlaneMesh.position.copy(this._planePosition)
			this._debugPlaneMesh.lookAt(this._flashlightModel._model.position)
		}
	}

	_updateLightPosition() {
		if (!this._mousetargetX) return
		const smoothness = 0.1
		const lerpFactor = 1 - Math.exp(-smoothness * this._deltaTime)

		this._mouseVector2.x = MathUtils.lerp(this._mouseVector2.x, this._mousetargetX, lerpFactor)
		this._mouseVector2.y = MathUtils.lerp(this._mouseVector2.y, this._mousetargetY, lerpFactor)

		const dx = this._mousetargetX - this._prevMouseRaw.x
		const dy = this._mousetargetY - this._prevMouseRaw.y

		const distSq = dx + dy
		this._mouseSpeed = distSq / this._deltaTime

		this._prevMouseRaw.x = this._mousetargetX
		this._prevMouseRaw.y = this._mousetargetY

		this._raycaster.setFromCamera(this._mouseVector2, this._camera.instance)
		this._raycaster.ray.intersectPlane(this._plane, this._intersectionResult)

		this._intersectionResult.x += this._xBreathingOffset
		this._intersectionResult.y += this._yBreathingOffset
		this._light.target.position.copy(this._intersectionResult)
		this._flashlightModel._model.lookAt(this._intersectionResult)
	}

	_updateBreathingMovement(timeElapsed) {
		if (!this._breathingSettings) return
		const TWO_PI = Math.PI * 2

		this._yBreathingOffset =
			this._breathingSettings.amplitudeY * 0.1 * Math.sin(TWO_PI * this._breathingSettings.speedY * 0.002 * timeElapsed)

		this._xBreathingOffset =
			this._breathingSettings.amplitudeX *
			0.1 *
			Math.cos((TWO_PI * this._breathingSettings.speedX * 0.002 * timeElapsed) / 2)
	}

	// Leans out after the pointer rests on the right edge, comes back after it rests on the left edge
	_updateEdgeLook(deltaTime) {
		if (!this._enabled || this._pointerX === undefined) return

		const isOnEdge = this._isLookingAside ? this._pointerX < LOOK_BACK_EDGE : this._pointerX > LOOK_ASIDE_EDGE
		this._edgeTime = isOnEdge ? this._edgeTime + deltaTime : 0
		if (this._edgeTime >= EDGE_DWELL) this.lookAside(!this._isLookingAside)
	}

	//Events
	_createEventListener() {
		this._pointerMoveHandler = (event) => this._onPointerMove(event)
		this._pointerDownHandler = (event) => this._onPointerDown(event)
		this._pointerUpHandler = () => this._onPointerUp()
		window.addEventListener('pointermove', this._pointerMoveHandler)
		window.addEventListener('pointerdown', this._pointerDownHandler)
		window.addEventListener('pointerup', this._pointerUpHandler)
		window.addEventListener('pointercancel', this._pointerUpHandler)

		// Any machine input brings the player back to the machine
		const backToMachine = () => this.lookAside(false)
		this._unsubscribers = [
			bus.on('lever', backToMachine),
			bus.on('button', backToMachine),
			bus.on('button-collect', backToMachine),
		]
	}

	_onPointerMove(event) {
		this._pointerX = event.clientX / window.innerWidth
		this._mousetargetX = (event.clientX / window.innerWidth) * 2 - 1
		this._mousetargetY = -(event.clientY / window.innerHeight) * 2 + 1
	}

	_onPointerDown(event) {
		if (event.button !== 0) return
		this._isPointerDown = true
		this._onPointerMove(event)
		if (this._isInSideView) this.enableLight()
	}

	_onPointerUp() {
		this._isPointerDown = false
		this.disableLight()
	}

	_createDebug() {
		const folder = this._debug.ui.addFolder({
			title: 'Flashlight Manager',
			expanded: true,
		})

		if (this._showDebugPlane) addTransformDebug(folder, this._debugPlaneMesh)

		const breathingFolder = folder.addFolder({ title: 'breathing animation' })

		breathingFolder.addBinding(this._breathingSettings, 'amplitudeY', {
			min: 0,
			max: 1,
			step: 0.001,
		})
		breathingFolder.addBinding(this._breathingSettings, 'speedY', {
			min: 0,
			max: 1,
			step: 0.001,
		})
		breathingFolder.addBinding(this._breathingSettings, 'amplitudeX', {
			min: 0,
			max: 1,
			step: 0.001,
		})
		breathingFolder.addBinding(this._breathingSettings, 'speedX', {
			min: 0,
			max: 1,
			step: 0.001,
		})
	}
}
