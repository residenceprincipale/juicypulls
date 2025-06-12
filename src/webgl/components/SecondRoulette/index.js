import Experience from 'core/Experience.js'
import rouletteVertexShader from './shadersRoulette/vertex.glsl';
import rouletteFragmentShader from './shadersRoulette/fragment.glsl';
import innerReflectionVertexShader from './shadersInnerReflection/vertex.glsl';
import innerReflectionFragmentShader from './shadersInnerReflection/fragment.glsl';
import { BoxGeometry, Mesh, ShaderMaterial, Vector3, MeshBasicMaterial, Vector2, RepeatWrapping, MeshMatcapMaterial, Color, MeshStandardMaterial, DirectionalLight, MeshPhongMaterial, DirectionalLightHelper } from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'
import addMaterialDebug from '@/webgl/utils/addMaterialDebug'
import addCustomMaterialDebug from '@/webgl/utils/addCustomMaterialDebug'
import addTransformDebug from '@/webgl/utils/addTransformDebug'
import { PhongCustomMaterial } from '@/webgl/materials/PhongMaterial'

import rouletteMaterialUniforms from './rouletteMaterialSettings.js'
import baseMaterialUniforms from './baseMaterialSettings.js'
import flapMaterialUniforms from './flapMaterialSettings.js'
import innerMaterialUniforms from './innerMaterialSettings.js'
import innerReflectionMaterialUniforms from './innerReflectionMaterialSettings.js'
export default class SecondRoulette {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug
		this._resources = this._scene.resources
		this._resource = this._resources.items.secondRouletteModel

		// this._createLights()
		this._createRouletteMaterial()
		this._createBaseMaterial()
		this._createFlapMaterial()
		// this._createInnerMaterial()
		// this._createInnerReflectionMaterial()


		this._createModel()

		// this.animateFlapOut()

		this._createEventListeners()

		if (this._debug.active) this._createDebug()
	}

	/**
	 * Getters & Setters
	 */
	get model() {
		return this._model;
	}

	get rouletteMaterial() {
		return this._rouletteMaterial;
	}

	get wheels() {
		return this._wheels
	}

	/**
	 * Public
	 */
	hide() {
		this._model.visible = false
	}

	show() {
		this._model.visible = true
	}

	animateFlapIn() {
		if (!this._flapsOpened) return
		this._flapOutTimeline?.kill()
		this._flapInTimeline = gsap.timeline();
		this._flapInTimeline.to(this._topFlap.position, {
			y: "-=0.07",
			z: "+=0.02",
			ease: "none",
			duration: 0.3,
		})
		this._flapInTimeline.to(this._topFlap.rotation, {
			x: "+=0.65",
			ease: "none",
			duration: 0.2,
		}, 0)
		this._flapInTimeline.to(this._bottomFlap.position, {
			y: "+=0.07",
			ease: "none",
			duration: 0.3,
		}, 0.05)
		this._flapInTimeline.to(this._bottomFlap.rotation, {
			z: "-=0.03",
			ease: "none",
			duration: 0.2,
		}, 0.05)

		this._flapsOpened = false

		return this._flapInTimeline;
	}

	animateFlapOut() {
		if (this._flapsOpened) return
		this._flapInTimeline?.kill()
		this._flapOutTimeline = gsap.timeline();
		this._flapOutTimeline.to(this._topFlap.position, {
			y: "+=0.07",
			z: "-=0.02",
			ease: "none",
			duration: 0.3,
		})
		this._flapOutTimeline.to(this._topFlap.rotation, {
			x: "-=0.65",
			ease: "none",
			duration: 0.2,
		}, 0)
		this._flapOutTimeline.to(this._bottomFlap.position, {
			y: "-=0.07",
			ease: "none",
			duration: 0.3,
		}, 0.1)
		this._flapOutTimeline.to(this._bottomFlap.rotation, {
			z: "+=0.03",
			ease: "none",
			duration: 0.1,
		}, 0.2)

		this._flapsOpened = true

		return this._flapOutTimeline;
	}

	animateIn() {
		this._inTimeline?.kill()
		this._outTimeline?.kill()
		this._inTimeline = gsap.timeline();

		// Drop animation with smoother ease
		this._inTimeline.to(this._model.position, {
			x: 0.003,
			y: 0.044,
			z: -0.164,
			ease: "power2.out",
			duration: 0.45,
		});

		// Single elastic swing that naturally oscillates and settles
		this._inTimeline.fromTo(this._base.rotation, {
			x: -0.32
		}, {
			x: 0.05,
			ease: "elastic.out(1.2, 0.3)",
			duration: 1.8,
		}, 0.1);

		// Single elastic swing that naturally oscillates and settles
		this._inTimeline.fromTo(this._attach.rotation, {
			z: -0.06
		}, {
			z: 0,
			ease: "elastic.out(1.2, 0.3)",
			duration: 2.0,
		}, 0.1);

		return this._inTimeline;
	}

	animateOut() {
		this._inTimeline?.kill()
		this._outTimeline?.kill()
		this._outTimeline = gsap.timeline();

		// Go back up animation with smoother ease
		this._outTimeline.to(this._model.position, {
			x: 0.000,
			y: 0.754,
			z: -0.2,
			ease: "power4.in",
			duration: 0.5,
		});

		// Add rotation when going up
		this._outTimeline.to(this._base.rotation, {
			x: -0.1,
			ease: "elastic.in(1.05, 0.4)",
			duration: 0.7,
		}, 0);
		this._outTimeline.to(this._attach.rotation, {
			z: -0.06,
			ease: "power3.in",
			duration: 0.4,
		}, 0);

		return this._outTimeline;
	}

	/**
	 * Private
	 */
	_createModel() {
		this._model = this._resource.scene
		this._model.name = 'second roulette'
		// Array to store wheel meshes
		this._wheels = [
			{ rotation: null, isLocked: false },
			{ rotation: null, isLocked: false },
		]
		this._flapsOpened = false
		this._leds = []

		this._model.traverse((child) => {
			if (!child.isMesh) return
			// if (child.name.includes('arrows')) {
			// 	child.material = this._arrowsMaterial
			// } else if (child.name.includes('attach')) {
			// 	child.material = this._attachMaterial
			// } else if (child.name.includes('base')) {
			child.material = this._baseMaterial;
			// } else if (child.name.includes('wheels')) {
			// 	child.material = this._rouletteMaterial
			// } else if (child.name.includes('VOLET')) {
			// 	child.material = this._voletMaterial
			// }

			if (child.name.includes('VOLET_HAUT')) {
				this._topFlap = child
				this._topFlap.material = this._flapMaterial
			} else if (child.name.includes('VOLET_BAS')) {
				this._bottomFlap = child
				this._bottomFlap.material = this._flapMaterial
			} else if (child.name.includes('base')) {
				this._base = child
			} else if (child.name.includes('attach')) {
				this._attach = child
			} else if (child.name.includes('wheels')) {
				child.material = this._rouletteMaterial;
				this._leds.push(child)
			}
		})

		this._wheels.forEach((wheel, index) => {
			wheel.rotation = this._rouletteMaterial.uniforms[`uRotation${index}`]
			wheel.rotation.value = 0
		})

		// this._base.rotation.x = 0.3

		this._model.position.set(0.000, 0.754, -0.174)
		// this._model.position.set(0.003, 0.039, -0.038)
		this._model.scale.set(0.817, 0.816, 0.816)
		this._scene.add(this._model)
	}

	_createBaseMaterial() {
		this._baseMaterial = new PhongCustomMaterial({
			// vertexShader: baseVertexShader,
			// fragmentShader: baseFragmentShader,
			uniforms: baseMaterialUniforms,
			name: 'Base Material',
			defines: {
				USE_ROUGHNESS: true,
				USE_ALBEDO: true,
				USE_NORMAL: true,
				USE_MATCAP: true,
				USE_AO: true,
			},
		});
	}

	_createFlapMaterial() {
		this._flapMaterial = new PhongCustomMaterial({
			// vertexShader: baseVertexShader,
			// fragmentShader: baseFragmentShader,
			uniforms: flapMaterialUniforms,
			name: 'Flap Material',
			defines: {
				USE_ROUGHNESS: true,
				USE_ALBEDO: true,
				USE_NORMAL: true,
				USE_MATCAP: true,
			},
		});
	}

	_createRouletteMaterial() {
		this._rouletteMaterial = new PhongCustomMaterial({
			vertexShader: rouletteVertexShader,
			fragmentShader: rouletteFragmentShader,
			uniforms: rouletteMaterialUniforms,
			name: 'Roulette Material',
			defines: {
				USE_ROUGHNESS: true,
				USE_MATCAP: true,
			},
		});
	}

	_createInnerReflectionMaterial() {
		this._innerReflectionMaterial = new PhongCustomMaterial({
			vertexShader: innerReflectionVertexShader,
			fragmentShader: innerReflectionFragmentShader,
			// vertexShader: rouletteVertexShader,
			// fragmentShader: rouletteFragmentShader,
			uniforms: innerReflectionMaterialUniforms,
			name: 'Inner Reflection Material',
			defines: {
				USE_ROUGHNESS: true,
				USE_MATCAP: true,
			},
		});
	}

	_createInnerMaterial() {
		this._innerMaterial = new PhongCustomMaterial({
			// vertexShader: innerVertexShader,
			// fragmentShader: innerFragmentShader,
			uniforms: innerMaterialUniforms,
			name: 'Inner Material',
			defines: {
				USE_ROUGHNESS: true,
				USE_MATCAP: true,
			},
		});
	}

	/**
	 * Events
	 */
	_createEventListeners() {

	}

	/**
	 * Debug
	 */
	_createDebug() {
		const folder = this._debug.ui.addFolder({
			title: 'Second Roulette',
			expanded: true,
		})

		folder.addButton({
			title: 'Animate Out'
		}).on('click', () => {
			this.animateOut()
		})

		folder.addButton({
			title: 'Animate In'
		}).on('click', () => {
			this.animateIn()
		})

		addCustomMaterialDebug(folder, rouletteMaterialUniforms, this._resources, this._rouletteMaterial)
		addCustomMaterialDebug(folder, baseMaterialUniforms, this._resources, this._baseMaterial)
		addCustomMaterialDebug(folder, flapMaterialUniforms, this._resources, this._flapMaterial)
		// addCustomMaterialDebug(folder, innerMaterialUniforms, this._resources, this._innerMaterial)
		// addCustomMaterialDebug(folder, innerReflectionMaterialUniforms, this._resources, this._innerReflectionMaterial)

		// Add transform controls for the model
		addTransformDebug(folder, this._model)

		folder.addButton({
			title: 'Flap In',
		}).on('click', () => {
			this.animateFlapIn()
		})
		folder.addButton({
			title: 'Flap Out',
		}).on('click', () => {
			this.animateFlapOut()
		})
	}
}
