import Debug from 'core/Debug.js'
import Sizes from 'core/Sizes.js'
import Time from 'core/Time.js'
import Camera from 'core/Camera.js'
import Renderer from './Renderer.js'
import SceneManager from 'core/SceneManager.js'
import { Mesh, Scene } from 'three'
import InteractionManager from 'core/InteractionManager.js'

let instance = null

export default class Experience {
	constructor(_canvas) {
		// Singleton
		if (instance) {
			return instance
		}
		instance = this

		// Global access
		window.experience = this

		// Options
		this.canvas = _canvas

		// Setup
		this.sizes = new Sizes()
		this.time = new Time()
		this.scene = new Scene()
		this.debug = new Debug()
		this.camera = new Camera()
		this.interactionManager = new InteractionManager(this.camera.instance)
		this.sceneManager = new SceneManager()
		this.renderer = new Renderer()

		// Resize event
		this.sizes.on('resize', () => {
			this.resize()
		})

		// Time tick event
		this.time.on('tick', () => {
			this.update()
		})
	}

	resize() {
		this.camera.resize()
		this.renderer.resize()
	}

	update() {
		if (this.sceneManager.update) this.sceneManager.update()
		this.renderer.update()
		this.debug.update()
		this.interactionManager.update()
	}

	dispose() {
		console.log('[Experience] Starting disposal...')

		// Remove event listeners before disposing
		this.sizes.off('resize')
		this.time.off('tick')

		// Dispose scene manager (which disposes the active scene)
		if (this.sceneManager && this.sceneManager.dispose) {
			this.sceneManager.dispose()
		}

		// Traverse the whole scene and dispose meshes
		this.scene.traverse((child) => {
			// Test if it's a mesh
			if (child instanceof Mesh) {
				if (child.geometry) {
					child.geometry.dispose()
				}

				// Dispose material
				if (child.material) {
					// Handle array of materials
					const materials = Array.isArray(child.material) ? child.material : [child.material]
					materials.forEach((material) => {
						// Loop through the material properties
						for (const key in material) {
							const value = material[key]

							// Test if there is a dispose function
							if (value && typeof value.dispose === 'function') {
								value.dispose()
							}
						}
						material.dispose()
					})
				}
			}
		})

		// Dispose core components
		if (this.interactionManager && this.interactionManager.dispose) {
			this.interactionManager.dispose()
		}

		if (this.camera && this.camera.dispose) {
			this.camera.dispose()
		}

		if (this.renderer) {
			if (this.renderer.dispose) {
				this.renderer.dispose()
			}
			if (this.renderer.instance) {
				this.renderer.instance.dispose()
			}
		}

		// Dispose time and sizes
		if (this.time && this.time.dispose) {
			this.time.dispose()
		}

		if (this.sizes && this.sizes.dispose) {
			this.sizes.dispose()
		}

		// Clear the scene
		while (this.scene.children.length > 0) {
			this.scene.remove(this.scene.children[0])
		}

		// Clear global reference
		if (window.experience === this) {
			window.experience = null
		}

		console.log('[Experience] Disposal complete')

		// if (this.debug.active) this.debug.ui.destroy()
	}
}
