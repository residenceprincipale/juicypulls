import Experience from 'core/Experience.js'
import { Vector2 } from 'three'
import addObjectDebug from 'utils/addObjectDebug.js'

const CONFIG = {
	ROTATION_RANGE: 0.1,
	ROTATION_SPEED: 0.002,
}

export default class Environment {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._resources = this._scene.resources
		this._debug = this._experience.debug
		this._camera = this._experience.camera

		this._glb = this._resources.items.environmentModel
		this._createModel()
		if (this._debug.active) this._createDebug()
	}

	/**
	 * public
	 */
	changeCamera(index) {
		if (this._glb.cameras[index]) {
			this._camera.instance = this._glb.cameras[index]
			this._camera.resize()
			this._experience.renderer.composer.setMainCamera(this._camera.instance)
		} else {
			console.warn(`Camera with index ${index} not found`)
			dispatchEvent(new CustomEvent('no-signal', { detail: { visible: true } }))
			this._scene.dispatchEvent({ type: 'display-snow' })
		}
	}

	update() {
		const camera = this._camera.instance
		if (camera.userData.rotationRange) {
			if (camera.userData.direction === 1) {
				camera.rotation.y += CONFIG.ROTATION_SPEED * this._experience.time.delta * 0.02
				if (camera.rotation.y > camera.userData.rotationRange.y) {
					camera.userData.direction = -1
				}
			} else {
				camera.rotation.y -= CONFIG.ROTATION_SPEED * this._experience.time.delta * 0.02
				if (camera.rotation.y < camera.userData.rotationRange.x) {
					camera.userData.direction = 1
				}
			}
		}
	}

	/**
	 * Private
	 */
	_createModel() {
		this._scene.add(this._glb.scene)
		this._glb.cameras.forEach((camera) => {
			camera.userData.baseRotation = camera.rotation.clone()
			camera.userData.rotationRange = new Vector2(
				camera.rotation.y - CONFIG.ROTATION_RANGE,
				camera.rotation.y + CONFIG.ROTATION_RANGE,
			)
			camera.userData.direction = 1
		})
		this._camera.instance = this._glb.cameras[0]
		this._experience.renderer.composer.setMainCamera(this._camera.instance)
	}

	_createDebug() {
		const debugFolder = addObjectDebug(this._debug.ui, this._glb.scene, {
			title: 'environment',
		})
		//ROTATION RANGE
		debugFolder
			.addBinding(CONFIG, 'ROTATION_RANGE', {
				min: 0,
				max: 1,
				step: 0.01,
			})
			.on('change', () => {
				this._glb.cameras.forEach((camera) => {
					camera.userData.rotationRange.x = camera.userData.baseRotation.y - CONFIG.ROTATION_RANGE
					camera.userData.rotationRange.y = camera.userData.baseRotation.y + CONFIG.ROTATION_RANGE
				})
			})
		//ROTATION SPEED
		debugFolder.addBinding(CONFIG, 'ROTATION_SPEED', {
			min: 0,
			max: 0.1,
			step: 0.001,
		})
	}
}
