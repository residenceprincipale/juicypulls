import Experience from './Experience.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { CameraHelper, PerspectiveCamera, Vector3 } from 'three'
import InputManager from 'utils/InputManager.js'
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js'
import addTransformDebug from '../utils/addTransformDebug.js'

// Space kept around the framed machine, in NDC (1 = half the window)
const FRAMING_MARGIN = 0.04

export default class Camera {
	constructor() {
		this.experience = new Experience()
		this.sizes = this.experience.sizes
		this.scene = this.experience.scene
		this.canvas = this.experience.canvas
		this.debug = this.experience.debug
		this.time = this.experience.time

		/**
		 * @type {{ fov: number, frustum: { min: number, max: number }, position: Vector3, target: Vector3, currentCamera: 'sceneCamera' | 'controlsCamera' | 'fpsCamera' }}
		 */
		this.options = {
			fov: 35,
			frustum: { min: 0.1, max: 200 },
			// Start view, and the viewing direction kept by the machine framing (see setFraming)
			position: new Vector3(0.01, 0.07, 1.24),
			target: new Vector3(0, 0.07, 0),
			currentCamera: this.debug.active ? 'sceneCamera' : 'sceneCamera', // sorry
		}

		// Added to the machine view (the flashlight side view slides the camera along x)
		this.viewOffset = new Vector3()

		this.setInstance()
		if (this.options.currentCamera === 'controlsCamera') this.setControlsCamera()
		if (this.options.currentCamera === 'fpsCamera') this.setFpsCamera()

		if (this.debug.active) this.setDebug()
	}

	#setCameraDebugPositionAndTarget(camera) {
		const debugCameraPosition = JSON.parse(sessionStorage.getItem('debugCameraPosition'))
		const debugCameraTarget = JSON.parse(sessionStorage.getItem('debugCameraTarget'))

		if (debugCameraPosition) {
			camera.position.copy(new Vector3(debugCameraPosition.x, debugCameraPosition.y, debugCameraPosition.z))
		} else {
			camera.position.copy(this.options.position)
		}

		if (debugCameraTarget) {
			camera.lookAt(new Vector3(debugCameraTarget.x, debugCameraTarget.y, debugCameraTarget.z))
			if (camera.controls?.target)
				camera.controls.target.copy(new Vector3(debugCameraTarget.x, debugCameraTarget.y, debugCameraTarget.z))
		} else {
			camera.lookAt(this.options.target)
		}
	}

	setInstance() {
		this.sceneCamera = new PerspectiveCamera(
			this.options.fov,
			this.sizes.width / this.sizes.height,
			this.options.frustum.min,
			this.options.frustum.max,
		)
		this.sceneCamera.position.copy(this.options.position)
		this.sceneCamera.lookAt(this.options.target)
		this.sceneCamera.updateMatrixWorld()
		this.sceneCamera.name = 'sceneCamera'

		this.instance = this.sceneCamera
	}

	setControlsCamera() {
		this.controlsCamera = new PerspectiveCamera(50, this.sizes.width / this.sizes.height)
		this.controlsCamera.name = 'controlsCamera'
		this.controlsCamera.controls = new OrbitControls(this.controlsCamera, this.canvas)

		// Bind the change handler so we can remove it later
		this.controlsCameraChangeHandler = () => {
			sessionStorage.setItem('debugCameraPosition', JSON.stringify(this.controlsCamera.position))
			sessionStorage.setItem('debugCameraTarget', JSON.stringify(this.controlsCamera.controls.target))
		}

		//Apply saved settings
		this.controlsCamera.controls.addEventListener('change', this.controlsCameraChangeHandler)

		this.#setCameraDebugPositionAndTarget(this.controlsCamera)

		//Helper
		if (!this.sceneCamera.cameraHelper) {
			this.sceneCamera.cameraHelper = new CameraHelper(this.sceneCamera)
			this.sceneCamera.cameraHelper.name = 'cameraHelper'
			// this.scene.add(this.sceneCamera.cameraHelper)
		}

		this.instance = this.controlsCamera
	}

	setFpsCamera() {
		this.fpsCamera = new PerspectiveCamera(50, this.sizes.width / this.sizes.height)
		this.fpsCamera.name = 'fpsCamera'

		this.#setCameraDebugPositionAndTarget(this.fpsCamera)

		this.fpsCamera.controls = new PointerLockControls(this.fpsCamera, this.canvas)

		// Bind the lock handler so we can remove it later
		this.fpsLockControlsHandler = () => {
			if (this.instance.name !== 'fpsCamera') return
			this.fpsCamera.controls.lock()
		}
		this.fpsCamera.controls.lockControls = this.fpsLockControlsHandler
		this.canvas.addEventListener('click', this.fpsLockControlsHandler)

		this.movement = {
			moveForward: false,
			moveBackward: false,
			moveLeft: false,
			moveRight: false,
			moveFaster: false,
		}

		const actions = {
			up: 'moveForward',
			down: 'moveBackward',
			left: 'moveLeft',
			right: 'moveRight',
			shift: 'moveFaster',
		}

		// Store input manager handlers so we can remove them later
		this.fpsInputHandlers = {}
		Object.keys(actions).forEach((action) => {
			this.fpsInputHandlers[action] = (value) => (this.movement[actions[action]] = value)
			InputManager.on(action, this.fpsInputHandlers[action])
		})

		const direction = new Vector3()

		// Store the tick handler so we can remove it later
		this.fpsTickHandler = () => {
			if (!this.fpsCamera.controls.isLocked) return
			this.fpsCamera.getWorldDirection(direction)
			const speed = this.movement.moveFaster ? 0.05 : 0.01
			const directionSpeed = direction.multiplyScalar(speed * this.time.delta)
			if (this.movement.moveForward) this.fpsCamera.position.add(directionSpeed)
			if (this.movement.moveBackward) this.fpsCamera.position.sub(directionSpeed)
			if (this.movement.moveRight) this.fpsCamera.position.add(directionSpeed.cross(this.fpsCamera.up))
			if (this.movement.moveLeft) this.fpsCamera.position.sub(directionSpeed.cross(this.fpsCamera.up))
		}
		this.time.on('tick', this.fpsTickHandler)

		// Bind the change handler so we can remove it later
		this.fpsCameraChangeHandler = () => {
			sessionStorage.setItem('debugCameraPosition', JSON.stringify(this.fpsCamera.position))

			const target = new Vector3()
			this.fpsCamera.getWorldDirection(target).multiplyScalar(20)
			target.add(this.fpsCamera.position)

			sessionStorage.setItem('debugCameraTarget', JSON.stringify(target))
		}
		this.fpsCamera.controls.addEventListener('change', this.fpsCameraChangeHandler)

		//Helper
		if (!this.sceneCamera.cameraHelper) {
			this.sceneCamera.cameraHelper = new CameraHelper(this.sceneCamera)
			this.sceneCamera.cameraHelper.name = 'cameraHelper'
			this.scene.add(this.sceneCamera.cameraHelper)
		}

		this.instance = this.fpsCamera
	}

	resetDebugPosition() {
		sessionStorage.removeItem('debugCameraPosition')
		sessionStorage.removeItem('debugCameraTarget')

		if (this.instance.name === 'sceneCamera') return
		this.instance.position.copy(this.options.position)
		this.instance.lookAt(this.options.target)
	}

	/**
	 * Set the active camera by name
	 * @param {string} cameraName - The name of the camera to activate ('sceneCamera', 'controlsCamera', 'fpsCamera')
	 */
	setCamera(cameraName) {
		// Validate camera name
		const validCameras = ['sceneCamera', 'controlsCamera', 'fpsCamera']
		console.log(cameraName)
		if (!validCameras.includes(cameraName)) {
			console.warn(`Invalid camera name: ${cameraName}. Valid options are: ${validCameras.join(', ')}`)
			return
		}

		const isSceneCamera = cameraName === 'sceneCamera'

		// Initialize the camera if it's not the scene camera
		if (!isSceneCamera) {
			this[`set${cameraName.charAt(0).toUpperCase() + cameraName.slice(1)}`]()
			this.#setCameraDebugPositionAndTarget(this[cameraName])
		}

		// Update camera helper visibility
		if (this.sceneCamera.cameraHelper) {
			this.sceneCamera.cameraHelper.visible = !isSceneCamera
		}

		// Enable/disable controls based on camera type
		if (this.controlsCamera) {
			this.controlsCamera.controls.enabled = cameraName === 'controlsCamera'
		}

		// Set the active camera instance
		this.instance = this[cameraName]

		// Update options to reflect current camera
		this.options.currentCamera = cameraName

		// Update camera references in renderer's postprocessing
		if (this.experience.renderer && this.experience.renderer.updateCameraReferences) {
			this.experience.renderer.updateCameraReferences()
		}
	}

	resize() {
		this.instance.aspect = this.sizes.width / this.sizes.height
		this.instance.updateProjectionMatrix()
		this.#fitFraming()
	}

	/**
	 * Keeps `box` (world Box3) in view for any window shape: the scene camera keeps the direction of
	 * `options.position → options.target` and moves along it, and slides sideways only when that lets it frame a
	 * narrow window closer. Refitted on resize.
	 */
	setFraming(box) {
		this.framingBox = box
		this.#fitFraming()
	}

	// Places the scene camera at the framed machine view plus `viewOffset` (call after changing `viewOffset`)
	applyView() {
		if (!this.machineView) return
		this.sceneCamera.position.copy(this.machineView.position).add(this.viewOffset)
		this.sceneCamera.lookAt(this.machineView.target.clone().add(this.viewOffset))
	}

	#fitFraming() {
		if (!this.framingBox) return

		const camera = this.sceneCamera
		const direction = this.options.position.clone().sub(this.options.target).normalize()
		const center = this.framingBox.getCenter(new Vector3())
		const { min, max } = this.framingBox
		const corners = [min.x, max.x].flatMap((x) =>
			[min.y, max.y].flatMap((y) => [min.z, max.z].map((z) => new Vector3(x, y, z))),
		)
		const projected = new Vector3()
		const target = new Vector3()

		const place = (offsetX, distance) => {
			target.set(offsetX, center.y, center.z)
			camera.position.copy(target).addScaledVector(direction, distance)
			camera.lookAt(target)
			camera.updateMatrixWorld()
		}
		const fits = () =>
			corners.every((corner) => {
				projected.copy(corner).project(camera)
				return Math.abs(projected.x) <= 1 - FRAMING_MARGIN && Math.abs(projected.y) <= 1 - FRAMING_MARGIN
			})
		const closestDistance = (offsetX) => {
			let near = 0.2
			let far = 50
			for (let i = 0; i < 30; i++) {
				const distance = (near + far) / 2
				place(offsetX, distance)
				if (fits()) far = distance
				else near = distance
			}
			return far
		}

		// Centered on the machine (x = 0), unless sliding toward the box center frames a narrow window closer
		let best = { offsetX: 0, distance: closestDistance(0) }
		for (const share of [0.25, 0.5, 0.75, 1]) {
			const offsetX = center.x * share
			const distance = closestDistance(offsetX)
			if (distance < best.distance * 0.98) best = { offsetX, distance }
		}
		place(best.offsetX, best.distance)

		this.machineView = { position: camera.position.clone(), target: target.clone() }
		this.applyView()
	}

	setDebug() {
		const debugFolder = this.debug.ui.addFolder({
			title: 'Camera',
			expanded: false,
		})

		debugFolder.addBinding(this.options, 'fov', { min: 0, max: 180, step: 1 }).on('change', () => {
			this.sceneCamera.fov = this.options.fov
			this.sceneCamera.updateProjectionMatrix()
			if (this.sceneCamera.cameraHelper) this.sceneCamera.cameraHelper.update()
		})

		debugFolder.addBinding(this.options, 'frustum', { min: 0.1, max: 100, step: 0.1 }).on('change', () => {
			this.sceneCamera.near = this.options.frustum.min
			this.sceneCamera.far = this.options.frustum.max
			this.sceneCamera.updateProjectionMatrix()
			if (this.sceneCamera.cameraHelper) this.sceneCamera.cameraHelper.update()
		})

		// Scene Camera Position Controls
		const positionFolder = debugFolder.addFolder({
			title: 'Scene Camera Position',
			expanded: false,
		})

		positionFolder.addBinding(this.sceneCamera, 'position', {
			x: { min: -20, max: 20, step: 0.01 },
			y: { min: -20, max: 20, step: 0.01 },
			z: { min: -20, max: 20, step: 0.01 },
		})

		positionFolder
			.addButton({
				title: 'Copy Position',
			})
			.on('click', () => {
				const x = parseFloat(this.sceneCamera.position.x.toFixed(3))
				const y = parseFloat(this.sceneCamera.position.y.toFixed(3))
				const z = parseFloat(this.sceneCamera.position.z.toFixed(3))
				const positionString = `${x},${y},${z}`
				navigator.clipboard.writeText(positionString).then(() => {
					console.log('Position copied to clipboard:', positionString)
				})
			})

		// Scene Camera Rotation Controls
		const rotationFolder = debugFolder.addFolder({
			title: 'Scene Camera Rotation',
			expanded: false,
		})

		rotationFolder.addBinding(this.sceneCamera, 'rotation', {
			x: { min: -Math.PI, max: Math.PI, step: 0.01 },
			y: { min: -Math.PI, max: Math.PI, step: 0.01 },
			z: { min: -Math.PI, max: Math.PI, step: 0.01 },
		})

		rotationFolder
			.addButton({
				title: 'Copy Rotation',
			})
			.on('click', () => {
				const x = parseFloat(this.sceneCamera.rotation.x.toFixed(3))
				const y = parseFloat(this.sceneCamera.rotation.y.toFixed(3))
				const z = parseFloat(this.sceneCamera.rotation.z.toFixed(3))
				const rotationString = `${x},${y},${z}`
				navigator.clipboard.writeText(rotationString).then(() => {
					console.log('Rotation copied to clipboard:', rotationString)
				})
			})

		debugFolder
			.addBlade({
				view: 'list',
				label: 'currentCamera',
				options: [
					{ text: 'SceneCamera', value: 'sceneCamera' },
					{ text: 'ControlsCamera', value: 'controlsCamera' },
					{ text: 'FpsCamera', value: 'fpsCamera' },
				],
				value: this.instance.name,
			})
			.on('change', ({ value }) => {
				this.setCamera(value)
			})

		debugFolder
			.addButton({
				title: 'Reset debug position',
			})
			.on('click', this.resetDebugPosition.bind(this))
	}

	dispose() {
		// Dispose scene camera
		this.scene.remove(this.sceneCamera)
		if (this.sceneCamera.cameraHelper) {
			this.sceneCamera.cameraHelper.dispose()
			this.scene.remove(this.sceneCamera.cameraHelper)
		}

		// Dispose controls camera
		if (this.controlsCamera) {
			if (this.controlsCamera.controls) {
				// Remove event listener
				if (this.controlsCameraChangeHandler) {
					this.controlsCamera.controls.removeEventListener('change', this.controlsCameraChangeHandler)
				}
				this.controlsCamera.controls.dispose()
			}
			this.scene.remove(this.controlsCamera)
		}

		// Dispose FPS camera
		if (this.fpsCamera) {
			// Remove event listeners
			if (this.fpsCameraChangeHandler) {
				this.fpsCamera.controls.removeEventListener('change', this.fpsCameraChangeHandler)
			}
			if (this.fpsLockControlsHandler) {
				this.canvas.removeEventListener('click', this.fpsLockControlsHandler)
			}

			// Remove tick handler
			if (this.fpsTickHandler) {
				this.time.off('tick', this.fpsTickHandler)
			}

			// Remove input handlers
			if (this.fpsInputHandlers) {
				Object.keys(this.fpsInputHandlers).forEach((action) => {
					InputManager.off(action, this.fpsInputHandlers[action])
				})
			}

			this.fpsCamera.controls.dispose()
			this.scene.remove(this.fpsCamera)
		}
	}
}
