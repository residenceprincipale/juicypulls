import * as THREE from 'three'

export default class SelectiveLightManager {
	constructor() {
		this._selectiveLightsArray = []
		this._nonSelectiveLightsArray = []
		this._initialized = false
	}

	/**
	 * Initialize the lighting arrays based on light settings
	 * @param {Array} lightSettings - Array of light setting objects
	 */
	initializeLights(lightSettings) {
		this._initialized = true

		// only include in the array if visible is true
		this._lightsArray = []
		lightSettings.forEach((light) => {
			if (light.visible.value) {
				this._lightsArray.push({
					key: light.name,
					value: 1,
				})
			}
		})
	}

	/**
	 * Get selective light uniforms for a material
	 * @param {Array} selectedLights - Array of light keys that should affect this material
	 * @returns {Object} - Uniforms object for the material
	 */
	getMaterialUniforms(selectedLights = []) {
		if (!this._initialized) {
			console.warn('SelectiveLightManager not initialized')
			return {}
		}

		selectedLights.forEach((light) => {
			if (!this._lightsArray.some((l) => l.key === light)) {
				// throw new Error(
				// 	`Light ${light} not found for Selective Lights Meterial setup : light either not visible or doesnt exist`,
				// )
			}
		})

		const selectiveLightUniforms = this._lightsArray.map((lightInfo) => {
			return selectedLights.includes(lightInfo.key) ? 1 : 0
		})

		return {
			uSelectiveLightsArray: { value: selectiveLightUniforms },
		}
	}

	/**
	 * Get all available light keys
	 * @returns {Array} - Array of light keys
	 */
	getAvailableLights() {
		return this._selectiveLightsArray.map((light) => light.key)
	}

	/**
	 * Get the selective lights array for global uniforms
	 * @returns {Array} - Array of selective light values
	 */
	getSelectiveLightsArray() {
		return this._selectiveLightsArray
	}

	/**
	 * Get the non-selective lights array for global uniforms
	 * @returns {Array} - Array of non-selective light values
	 */
	getNonSelectiveLightsArray() {
		return this._nonSelectiveLightsArray
	}

	/**
	 * Update THREE.js UniformsLib with selective lighting arrays
	 */
	updateGlobalUniforms() {
		if (!this._initialized) return

		// console.log('this._lightsArray', this._lightsArray);

		// Add our custom uniforms to Three.js UniformsLib
		if (!THREE.UniformsLib.lights.selectiveDirLights) {
			THREE.UniformsLib.lights.selectiveDirLights = { value: this._lightsArray }
		} else {
			THREE.UniformsLib.lights.selectiveDirLights.value = this._lightsArray
		}
	}
}
