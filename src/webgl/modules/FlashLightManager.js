import { mapRange } from 'gsap/src/all'
import { MeshBasicMaterial } from 'three'
import { Mesh, Plane } from 'three'
import { Vector2 } from 'three'
import Experience from '../core/Experience'
import { Vector3 } from 'three'
import { PlaneGeometry } from 'three'
import addTransformDebug from '../utils/addTransformDebug'
import { lerp } from 'three/src/math/MathUtils'

export default class FlashlightManager {
	constructor(options = {}) {
		this._flashlightModel = options.flashlightModel
		this._light = options.light
		console.log(this._light)

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

		this._enabled = true

		this._setupLightPosition()
		this._createEventListener()
		if (this._debug.active) this._createDebug()
	}

	//Public
	enableLight() {
		this._enabled = true
	}

	update(timeData) {
		if (!this._enabled) return
		this._elapsedTime = timeData.elapsedTime
		this._deltaTime = timeData.deltaTime

		this._updateBreathingMovement(this._elapsedTime)
		this._updateLightPosition()
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

		this._mouseVector2.x = lerp(this._mouseVector2.x, this._mousetargetX, lerpFactor)
		this._mouseVector2.y = lerp(this._mouseVector2.y, this._mousetargetY, lerpFactor)

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

	//Events
	_createEventListener() {
		window.addEventListener('mousemove', this._mouseMoveHandler.bind(this))
		window.addEventListener('mousedown', this._mouseDownHandler.bind(this))
		window.addEventListener('mouseup', this._mouseUpHandler.bind(this))
	}

	_mouseMoveHandler(event) {
		if (!this._enabled) return

		this._mousetargetX = (event.clientX / window.innerWidth) * 2 - 1
		this._mousetargetY = -(event.clientY / window.innerHeight) * 2 + 1
	}
	_mouseDownHandler(event) {
		if (!this._enabled) return
	}
	_mouseUpHandler(event) {
		if (!this._enabled) return
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
