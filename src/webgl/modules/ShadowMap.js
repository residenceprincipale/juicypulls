import { CameraHelper, Color, UniformsLib, Vector3 } from 'three'

class ShadowMap {
	constructor(options = {}) {
		this._debug = options.debugFolder
		this._light = options.light
		this._settings = options.settings
		this._scene = options.scene

		this._shadows = this._createShadows()
		this._createShadowsUniforms()
		this._debugFolder = this._createDebugFolder()
	}

	/**
	 * Getters & Setters
	 */

	get light() {
		return this._light
	}

	get shadows() {
		return this._shadows
	}

	/**
	 * Public
	 */
	destroy() {
		this._lightHelper?.dispose()
	}

	/**
	 * Private
	 */

	_createShadows() {
		this._light.castShadow = this._settings.enabled

		this._light.shadow.camera.left = this._settings.frustumSize.x
			? -this._settings.frustumSize.x / 2
			: -this._settings.frustumSize / 2
		this._light.shadow.camera.right = this._settings.frustumSize.x
			? this._settings.frustumSize.x / 2
			: this._settings.frustumSize / 2
		this._light.shadow.camera.top = this._settings.frustumSize.y
			? this._settings.frustumSize.y / 2
			: this._settings.frustumSize / 2
		this._light.shadow.camera.bottom = this._settings.frustumSize.y
			? -this._settings.frustumSize.y / 2
			: -this._settings.frustumSize / 2
		this._light.shadow.camera.near = this._settings.near
		this._light.shadow.camera.far = this._settings.far

		this._light.shadow.camera.position.copy(this._light.position)

		this._light.direction = new Vector3()
		this._light.direction.subVectors(this._light.target.position, this._light.position).normalize()

		this._light.shadow.mapSize.x = this._settings.mapSize.x
		this._light.shadow.mapSize.y = this._settings.mapSize.y

		this._light.shadow.bias = this._settings.bias

		this._light.shadow.blurSamples = this._settings.blurSamples ? this._settings.blurSamples : 8

		this._light.shadow.radius = this._settings.radius ? this._settings.radius : 2

		this._lightHelper = new CameraHelper(this._light.shadow.camera)
		this._lightHelper.visible = this._settings.showHelper
		this._scene.add(this._lightHelper)

		return this._light.shadow
	}

	_createShadowsUniforms() {
		UniformsLib.lights.uShadowColor = { value: new Color(this._settings.color) }
		UniformsLib.lights.uShadowIntensity = { value: this._settings.intensity }
	}

	/**
	 * Debug
	 */
	_createDebugFolder() {
		if (!this._debug) return
		const debugFolder = this._debug.addFolder({ title: '👥 Shadow Map' })

		debugFolder.addBinding(this._settings, 'enabled', { label: 'Enable' }).on('change', (value) => {
			this._light.castShadow = this._settings.enabled
			if (this._settings.showHelper) {
				this._lightHelper.visible = this._settings.enabled
			}
		})
		debugFolder.addBinding(this._settings, 'showHelper', { label: 'Show Helper' }).on('change', (value) => {
			this._lightHelper.visible = this._settings.showHelper
		})
		debugFolder.addBinding(this._settings, 'color', { label: 'Color' }).on('change', this._onChangeSettings.bind(this))

		debugFolder.addBinding(this._settings, 'frustumSize', { label: 'Frustum' }).on('change', (value) => {
			this._light.shadow.camera.left = -this._settings.frustumSize / 2
			this._light.shadow.camera.right = this._settings.frustumSize / 2
			this._light.shadow.camera.top = this._settings.frustumSize / 2
			this._light.shadow.camera.bottom = -this._settings.frustumSize / 2
			this._light.shadow.camera.updateProjectionMatrix()
			this._lightHelper.update()
		})

		debugFolder.addBinding(this._settings, 'near', { label: 'Near' }).on('change', (value) => {
			this._light.shadow.camera.near = this._settings.near
			this._light.shadow.camera.updateProjectionMatrix()
			this._lightHelper.update()
		})

		debugFolder.addBinding(this._settings, 'far', { label: 'Far' }).on('change', (value) => {
			this._light.shadow.camera.far = this._settings.far
			this._light.shadow.camera.updateProjectionMatrix()
			this._lightHelper.update()
		})

		debugFolder.addBinding(this._settings, 'bias', { label: 'Bias' }).on('change', (value) => {
			this._light.shadow.bias = this._settings.bias
		})
		debugFolder
			.addBinding(this._settings, 'intensity', { label: 'Intensity' })
			.on('change', this._onChangeSettings.bind(this))
		debugFolder.addBinding(this._settings, 'blurSamples', { label: 'Blur' }).on('change', (value) => {
			this._light.shadow.blurSamples = this._settings.blurSamples
		})
		debugFolder.addBinding(this._settings, 'radius', { label: 'Radius' }).on('change', (value) => {
			this._light.shadow.radius = this._settings.radius
		})

		return debugFolder
	}

	_onChangeSettings() {
		this._scene.traverse((child) => {
			if (child.material) {
				const uniforms = child.material.uniforms
				if (uniforms) {
					if (uniforms.uShadowColor) {
						uniforms.uShadowColor.value = new Color(this._settings.color)
						uniforms.uShadowIntensity.value = this._settings.intensity
					}
				}
			}
		})
	}
}

export default ShadowMap
