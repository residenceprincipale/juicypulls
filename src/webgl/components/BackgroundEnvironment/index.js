import Experience from 'core/Experience.js'
import {
	BoxGeometry,
	Mesh,
	ShaderMaterial,
	Vector3,
	MeshBasicMaterial,
	Vector2,
	RepeatWrapping,
	MeshMatcapMaterial,
	Color,
	MeshStandardMaterial,
	DirectionalLight,
	MeshPhongMaterial,
	DirectionalLightHelper,
	InstancedMesh,
	Matrix4,
	Quaternion,
} from 'three'
import gsap from 'gsap'
import addObjectDebug from 'utils/addObjectDebug.js'
import addMaterialDebug from '@/webgl/utils/addMaterialDebug'
import addCustomMaterialDebug from '@/webgl/utils/addCustomMaterialDebug'
import addTransformDebug from '@/webgl/utils/addTransformDebug'
import { PhongCustomMaterial } from '@/webgl/materials/PhongMaterial'
import { kebabToCamelCase } from '@/webgl/utils/stringUtils.js'

import sampleMaterialUniforms from './settings.js'
import borneMaterialSettings from './borneMaterialSettings.js'
import chairTopMaterialSettings from './chairTopMaterialSettings.js'
import chairBottomMaterialSettings from './chairBottomMaterialSettings.js'
import columnMaterialSettings from './columnMaterialSettings.js'
import floorMaterialSettings from './floorMaterialSettings.js'
import lightMaterialSettings from './lightMaterialSettings.js'
import roofMaterialSettings from './roofMaterialSettings'
import poutreMaterialSettings from './poutreMaterialSettings'
import tableMaterialSettings from './tableMaterialSettings'
import stairsMaterialSettings from './stairsMaterialSettings'

export default class BackgroundEnvironment {
	constructor() {
		this._experience = new Experience()
		this._scene = this._experience.scene
		this._debug = this._experience.debug
		this._resources = this._scene.resources
		this._resource = this._resources.items.environmentModel
		this._materialsArray = []
		this._modelMeshes = {}
		this._borneInstancedMesh = null
		this._chaiseAssiseInstancedMesh = null
		this._chaiseMetalInstancedMesh = null
		this._colonneInstancedMesh = null
		this._lightInstancedMesh = null
		this._lightCubeInstancedMesh = null

		// Flicker animation properties
		this._lightFlickerData = []
		this._flickerAnimation = null

		// Light grid settings
		this._lightGridSettings = {
			xCount: 5,
			zCount: 5,
			xSpacing: 6.0,
			zSpacing: 2.8,
			yOffset: 3.3, // Height above the floor
			startPosition: {
				x: 16.2,
				z: -1.3,
			},
		}

		this._createBorneMaterial()
		this._createChairMaterials()
		this._createColumnMaterial()
		this._createWhiteLightMaterial()
		this._createLightMaterial()
		this._createModel()
		this._createEventListeners()

		this._createFloorMaterial()
		this._createRoofMaterial()
		this._createPoutreMaterial()
		this._createTableMaterial()
		this._createStairsMaterial()

		if (this._debug.active) this._createDebug()
	}

	/**
	 * Getters & Setters
	 */
	get model() {
		return this._model
	}

	get modelMeshes() {
		return this._modelMeshes
	}

	get borneInstancedMesh() {
		return this._borneInstancedMesh
	}

	get chaiseAssiseInstancedMesh() {
		return this._chaiseAssiseInstancedMesh
	}

	get chaiseMetalInstancedMesh() {
		return this._chaiseMetalInstancedMesh
	}

	get colonneInstancedMesh() {
		return this._colonneInstancedMesh
	}

	get lightInstancedMesh() {
		return this._lightInstancedMesh
	}

	get lightCubeInstancedMesh() {
		return this._lightCubeInstancedMesh
	}

	dispose() {
		this._materialsArray.forEach((mat) => {
			mat.dispose()
		})
	}

	/**
	 * Public
	 */
	hide() {
		this._model.visible = false
		this._chaiseAssiseInstancedMesh.visible = false
		this._chaiseMetalInstancedMesh.visible = false
		this._colonneInstancedMesh.visible = false
		this._lightInstancedMesh.visible = false
		this._lightCubeInstancedMesh.visible = false

		this._borneInstancedMesh.visible = false
	}

	show() {
		this._model.visible = true
		this._chaiseAssiseInstancedMesh.visible = true
		this._chaiseMetalInstancedMesh.visible = true
		this._colonneInstancedMesh.visible = true
		this._lightInstancedMesh.visible = true
		this._lightCubeInstancedMesh.visible = true
		this._borneInstancedMesh.visible = true
	}

	/**
	 * Private
	 */
	_createModel() {
		// If you have a specific model resource, use it
		// this._model = this._resource.scene

		// For demo purposes, use the created mesh as the model
		this._model = this._resource.scene
		this._model.name = 'background environment'
		this._model.position.set(-4.186, -2.468, -6.599)
		this._model.scale.set(2, 2, 2)
		this._model.rotation.set(-3.142, 1.812, -3.142)

		this._scene.add(this._model)

		this._columnEmpties = []
		this._chairEmpties = []
		this._borneEmpties = []

		// Register all meshes with camelCase names and apply materials
		this._model.traverse((child) => {
			if (!child.isMesh) {
				if (child.name.includes('colonne')) {
					this._columnEmpties.push(child)
				}
				if (child.name.includes('chaise')) {
					this._chairEmpties.push(child)
				}
				if (child.name.includes('borne')) {
					this._borneEmpties.push(child)
				}
				return
			}

			// Register mesh in modelMeshes object with camelCase name
			if (child.name) {
				const camelCaseName = kebabToCamelCase(child.name)
				this._modelMeshes[camelCaseName] = child
			}

			// Apply materials to specific parts
		})

		// Create instances after traversal
		this._createBorneInstances()
		this._createChairInstances()
		this._createColumnInstances()
		this._createLightInstances()
		// this._setupLightFlicker()

		this._modelMeshes.wallMesh.material.dispose()
		this._modelMeshes.wallMesh.material = new MeshBasicMaterial({
			color: new Color(0, 0, 0),
		})
	}

	_createBorneMaterial() {
		this._borneMaterial = new PhongCustomMaterial({
			uniforms: borneMaterialSettings,
			name: 'Borne Material',
			useSelectiveLights: true,
			lights: ['lightEnvTwo'],
			defines: {
				USE_ROUGHNESS: true,
				USE_MATCAP: true,
				USE_AO: true,
			},
		})

		this._materialsArray.push(this._borneMaterial)
	}

	_createChairMaterials() {
		this._chairTopMaterial = new PhongCustomMaterial({
			uniforms: chairTopMaterialSettings,
			name: 'Chair Top Material',
			defines: {
				USE_MATCAP: true,
				USE_AO: true,
			},
		})

		this._chairBottomMaterial = new PhongCustomMaterial({
			uniforms: chairBottomMaterialSettings,
			name: 'Chair Bottom Material',
			defines: {
				USE_MATCAP: true,
				USE_AO: true,
			},
		})

		this._materialsArray.push(this._chairTopMaterial, this._chairBottomMaterial)
	}

	_createColumnMaterial() {
		this._columnMaterial = new PhongCustomMaterial({
			uniforms: columnMaterialSettings,
			name: 'Column Material',
			defines: {
				// USE_MATCAP: true,
				USE_AO: true,
				USE_ROUGHNESS: true,
			},
		})
		this._materialsArray.push(this._columnMaterial)
	}

	_createWhiteLightMaterial() {
		this._whiteLightMaterial = new MeshBasicMaterial({
			color: new Color(1, 1, 1), // Pure white
			name: 'White Light Material',
		})

		this._materialsArray.push(this._whiteLightMaterial)
	}

	_createLightMaterial() {
		this._lightMaterial = new PhongCustomMaterial({
			uniforms: lightMaterialSettings,
			name: 'Light Material',
			defines: {
				USE_AO: true,
				USE_ROUGHNESS: true,
				USE_MATCAP: true,
			},
		})
		this._materialsArray.push(this._lightMaterial)
	}

	_createFloorMaterial() {
		this._floorMaterial = new PhongCustomMaterial({
			uniforms: floorMaterialSettings,
			name: 'Floor Material',
			defines: {
				USE_AO: true,
				USE_ALBEDO: true,
			},
		})

		this._modelMeshes.carpet.material.dispose()
		this._modelMeshes.carpet.material = this._floorMaterial
		this._materialsArray.push(this._floorMaterial)
	}

	_createRoofMaterial() {
		this._roofMaterial = new PhongCustomMaterial({
			uniforms: roofMaterialSettings,
			name: 'Roof Material',
			defines: {
				USE_AO: true,
				USE_ALBEDO: true,
			},
		})

		this._modelMeshes.roof.material.dispose()
		this._modelMeshes.roof.material = this._roofMaterial
		this._materialsArray.push(this._roofMaterial)
	}

	_createPoutreMaterial() {
		this._poutreMaterial = new PhongCustomMaterial({
			uniforms: poutreMaterialSettings,
			name: 'Poutre Material',
			defines: {
				USE_AO: true,
				USE_MATCAP: true,
			},
		})

		this._modelMeshes.poutre.material.dispose()
		this._modelMeshes.poutre.material = this._poutreMaterial
		this._materialsArray.push(this._poutreMaterial)
	}

	_createTableMaterial() {
		this._tableMaterial = new PhongCustomMaterial({
			uniforms: tableMaterialSettings,
			name: 'Table Material',
			defines: {
				USE_AO: true,
				USE_MATCAP: true,
				USE_ALBEDO: true,
			},
		})

		this._modelMeshes.tableGreen.material.dispose()
		this._modelMeshes.tableGreen.material = this._tableMaterial

		this._modelMeshes.tableMetal.material.dispose()
		// // create a matcap material
		// this._tableMetalMaterial = new MeshMatcapMaterial({
		//     matcap: this._resources.items.metalMatcapShiny,
		//     name: 'Table Metal Material',
		//     color: new Color('#666666'),
		// })
		this._modelMeshes.tableMetal.material = this._tableMaterial

		this._modelMeshes.tableWood.material.dispose()
		this._modelMeshes.tableWood.material = this._tableMaterial

		this._materialsArray.push(this._tableMaterial)
	}

	_createStairsMaterial() {
		this._stairsMaterial = new PhongCustomMaterial({
			uniforms: stairsMaterialSettings,
			name: 'Stairs Material',
		})

		this._modelMeshes.stairs.material.dispose()
		this._modelMeshes.stairs.material = this._stairsMaterial

		this._modelMeshes.stairsWall.material.dispose()
		this._modelMeshes.stairsWall.material = this._stairsMaterial

		this._modelMeshes.stairsMetal.material.dispose()
		this._modelMeshes.stairsMetal.material = this._stairsMaterial

		this._materialsArray.push(this._stairsMaterial)
	}

	_createBorneInstances() {
		if (this._borneEmpties.length === 0) {
			console.log('No borne empties found to create instances')
			return
		}

		// Get the borne mesh from modelMeshes
		const borneMesh = this._modelMeshes.borneMesh
		if (!borneMesh) {
			console.error('borneMesh not found in modelMeshes. Available meshes:', Object.keys(this._modelMeshes))
			return
		}

		// Use geometry and material from the existing borne mesh
		const borneGeometry = borneMesh.geometry
		const borneMaterial = this._borneMaterial

		// Create InstancedMesh for better performance (single draw call)
		const instanceCount = this._borneEmpties.length
		this._borneInstancedMesh = new InstancedMesh(borneGeometry, borneMaterial, instanceCount)

		// Create transformation matrix for each instance
		const matrix = new Matrix4()

		this._borneEmpties.forEach((empty, index) => {
			// Apply the same transformations as the main model
			// 1. First apply the model's scale to the empty's position and scale
			const scaledPosition = empty.position.clone().multiply(this._model.scale)
			const finalScale = this._model.scale

			// 2. Apply the model's rotation to the scaled position
			scaledPosition.applyEuler(this._model.rotation)

			// 3. Add the model's position offset
			const finalPosition = scaledPosition.add(this._model.position)

			// 4. Apply rotations
			const rotation = {
				x: empty.rotation.x,
				y: 1.3 - empty.rotation.y * 4,
				z: empty.rotation.z,
			}

			// Create transformation matrix for this instance
			matrix.makeRotationFromEuler({
				x: rotation.x,
				y: rotation.y,
				z: rotation.z,
				order: 'XYZ',
			})
			matrix.scale(finalScale)
			matrix.setPosition(finalPosition)

			// Set the matrix for this instance
			this._borneInstancedMesh.setMatrixAt(index, matrix)
		})

		// Update the instanced mesh
		this._borneInstancedMesh.instanceMatrix.needsUpdate = true

		// Add to scene
		this._scene.add(this._borneInstancedMesh)

		// Hide the reference mesh since we're using instances
		borneMesh.visible = false

		// console.log(`Created InstancedMesh with ${instanceCount} borne instances (single draw call)`)
	}

	_createChairInstances() {
		if (this._chairEmpties.length === 0) {
			console.log('No chair empties found to create instances')
			return
		}

		// Get both chair meshes from modelMeshes
		const chaiseAssiseMesh = this._modelMeshes.chaiseAssiseMesh
		const chaiseMetalMesh = this._modelMeshes.chaiseMetalMesh

		if (!chaiseAssiseMesh) {
			console.error('chaiseAssiseMesh not found in modelMeshes. Available meshes:', Object.keys(this._modelMeshes))
			return
		}

		if (!chaiseMetalMesh) {
			console.error('chaiseMetalMesh not found in modelMeshes. Available meshes:', Object.keys(this._modelMeshes))
			return
		}

		const instanceCount = this._chairEmpties.length

		// Create InstancedMesh for chair seat
		this._chaiseAssiseInstancedMesh = new InstancedMesh(
			chaiseAssiseMesh.geometry,
			this._chairTopMaterial,
			instanceCount,
		)

		// Create InstancedMesh for chair metal parts
		this._chaiseMetalInstancedMesh = new InstancedMesh(
			chaiseMetalMesh.geometry,
			this._chairBottomMaterial,
			instanceCount,
		)

		// Create transformation matrix for each instance
		const matrix = new Matrix4()

		this._chairEmpties.forEach((empty, index) => {
			// Apply the same transformations as the main model
			const scaledPosition = empty.position.clone().multiply(this._model.scale)
			const finalScale = this._model.scale

			// Apply the model's rotation to the scaled position
			scaledPosition.applyEuler(this._model.rotation)

			// Add the model's position offset
			const finalPosition = scaledPosition.add(this._model.position)

			// Apply rotations (same logic as borne)
			const rotation = {
				x: empty.rotation.x,
				y: 1.3 - empty.rotation.y * 4,
				z: empty.rotation.z,
			}

			// Create transformation matrix for this instance
			matrix.makeRotationFromEuler({
				x: rotation.x,
				y: rotation.y,
				z: rotation.z,
				order: 'XYZ',
			})
			matrix.scale(finalScale)
			matrix.setPosition(finalPosition)

			// Set the same matrix for both chair parts
			this._chaiseAssiseInstancedMesh.setMatrixAt(index, matrix)
			this._chaiseMetalInstancedMesh.setMatrixAt(index, matrix)
		})

		// Update both instanced meshes
		this._chaiseAssiseInstancedMesh.instanceMatrix.needsUpdate = true
		this._chaiseMetalInstancedMesh.instanceMatrix.needsUpdate = true

		// Add both to scene
		this._scene.add(this._chaiseAssiseInstancedMesh)
		this._scene.add(this._chaiseMetalInstancedMesh)

		// Hide the reference meshes since we're using instances
		chaiseAssiseMesh.visible = false
		chaiseMetalMesh.visible = false

		// console.log(`Created 2 InstancedMeshes with ${instanceCount} chair instances each (2 draw calls total)`)
	}

	_createColumnInstances() {
		if (this._columnEmpties.length === 0) {
			console.log('No column empties found to create instances')
			return
		}

		// Get the column mesh from modelMeshes
		const colonneMesh = this._modelMeshes.colonneMesh
		if (!colonneMesh) {
			console.error('colonneMesh not found in modelMeshes. Available meshes:', Object.keys(this._modelMeshes))
			return
		}

		// Create InstancedMesh for better performance (single draw call)
		const instanceCount = this._columnEmpties.length
		this._colonneInstancedMesh = new InstancedMesh(colonneMesh.geometry, this._columnMaterial, instanceCount)

		// Create transformation matrix for each instance
		const matrix = new Matrix4()

		this._columnEmpties.forEach((empty, index) => {
			// Apply the same transformations as the main model
			const scaledPosition = empty.position.clone().multiply(this._model.scale)
			const finalScale = this._model.scale

			// Apply the model's rotation to the scaled position
			scaledPosition.applyEuler(this._model.rotation)

			// Add the model's position offset
			const finalPosition = scaledPosition.add(this._model.position)

			// Apply rotations (same logic as borne)
			const rotation = {
				x: empty.rotation.x,
				y: 1.3 - empty.rotation.y * 4,
				z: empty.rotation.z,
			}

			// Create transformation matrix for this instance
			matrix.makeRotationFromEuler({
				x: rotation.x,
				y: rotation.y,
				z: rotation.z,
				order: 'XYZ',
			})
			matrix.scale(finalScale)
			matrix.setPosition(finalPosition)

			// Set the matrix for this instance
			this._colonneInstancedMesh.setMatrixAt(index, matrix)
		})

		// Update the instanced mesh
		this._colonneInstancedMesh.instanceMatrix.needsUpdate = true

		// Add to scene
		this._scene.add(this._colonneInstancedMesh)

		// Hide the reference mesh since we're using instances
		colonneMesh.visible = false

		// console.log(`Created InstancedMesh with ${instanceCount} column instances (single draw call)`)
	}

	_createLightInstances() {
		// Get the patern light mesh from modelMeshes
		const paternLightMesh = this._modelMeshes.patternLightMesh
		if (!paternLightMesh) {
			console.error('patternLightMesh not found in modelMeshes. Available meshes:', Object.keys(this._modelMeshes))
			return
		}

		const { xCount, zCount, xSpacing, zSpacing, yOffset } = this._lightGridSettings
		const instanceCount = xCount * zCount

		// Create InstancedMesh for lights
		this._lightInstancedMesh = new InstancedMesh(paternLightMesh.geometry, this._lightMaterial, instanceCount)

		// Create InstancedMesh for cubes at the center of each light
		const cubeGeometry = new BoxGeometry(0.65, 0.12, 0.65)
		this._lightCubeInstancedMesh = new InstancedMesh(cubeGeometry, this._whiteLightMaterial, instanceCount)

		// Create transformation matrix for each instance
		const matrix = new Matrix4()

		let instanceIndex = 0
		for (let x = 0; x < xCount; x++) {
			for (let z = 0; z < zCount; z++) {
				// Calculate grid position (centered around origin)
				const xPos = (x - (xCount - 1) / 2) * xSpacing + this._lightGridSettings.startPosition.x
				const zPos = (z - (zCount - 1) / 2) * zSpacing + this._lightGridSettings.startPosition.z
				const yPos = yOffset

				// Apply the same transformations as the main model
				const localPosition = new Vector3(xPos, yPos, zPos)
				const scaledPosition = localPosition.multiply(this._model.scale)
				const finalScale = this._model.scale

				// Apply the model's rotation to the scaled position
				scaledPosition.applyEuler(this._model.rotation)

				// Add the model's position offset
				const finalPosition = scaledPosition.add(this._model.position)

				// Apply the same rotation logic as other instances
				const rotation = {
					x: this._model.rotation.x,
					y: this._model.rotation.y,
					z: this._model.rotation.z,
				}

				// Create transformation matrix for this instance
				matrix.makeRotationFromEuler({
					x: rotation.x,
					y: rotation.y,
					z: rotation.z,
					order: 'XYZ',
				})
				matrix.scale(finalScale)
				matrix.setPosition(finalPosition)

				// Set the matrix for both light and cube instances
				this._lightInstancedMesh.setMatrixAt(instanceIndex, matrix)
				this._lightCubeInstancedMesh.setMatrixAt(instanceIndex, matrix)
				instanceIndex++
			}
		}

		// Update the instanced meshes
		this._lightInstancedMesh.instanceMatrix.needsUpdate = true
		this._lightCubeInstancedMesh.instanceMatrix.needsUpdate = true
		this._lightCubeInstancedMesh.userData.renderBloom = true

		// Add to scene
		this._scene.add(this._lightInstancedMesh)
		this._scene.add(this._lightCubeInstancedMesh)

		// Hide the reference mesh since we're using instances
		paternLightMesh.visible = false

		// console.log(`Created InstancedMesh with ${instanceCount} light instances in a ${xCount}x${zCount} grid (single draw call)`)
	}

	_recreateLightInstances() {
		// Kill existing flicker animation
		if (this._flickerAnimation) {
			gsap.killTweensOf(this._lightFlickerData)
			this._flickerAnimation = null
		}

		if (this._lightInstancedMesh) {
			this._scene.remove(this._lightInstancedMesh)
			this._lightInstancedMesh.geometry.dispose()
			this._lightInstancedMesh.material.dispose()
			this._lightInstancedMesh = null
		}
		if (this._lightCubeInstancedMesh) {
			this._scene.remove(this._lightCubeInstancedMesh)
			this._lightCubeInstancedMesh.geometry.dispose()
			this._lightCubeInstancedMesh.material.dispose()
			this._lightCubeInstancedMesh = null
		}

		// Recreate light instances with new settings
		this._createLightInstances()
		// this._setupLightFlicker()
	}

	_createEventListeners() {
		// Add event listeners here if needed
	}

	_createDebug() {
		if (!this._debug.active) return

		const debugFolder = this._debug.ui.addFolder({
			title: 'Background Environment',
			expanded: false,
		})

		// Material debug
		addCustomMaterialDebug(debugFolder, borneMaterialSettings, this._resources, this._borneMaterial)
		addCustomMaterialDebug(debugFolder, chairTopMaterialSettings, this._resources, this._chairTopMaterial)
		addCustomMaterialDebug(debugFolder, chairBottomMaterialSettings, this._resources, this._chairBottomMaterial)
		addCustomMaterialDebug(debugFolder, columnMaterialSettings, this._resources, this._columnMaterial)
		addCustomMaterialDebug(debugFolder, tableMaterialSettings, this._resources, this._tableMaterial)
		addCustomMaterialDebug(debugFolder, stairsMaterialSettings, this._resources, this._stairsMaterial)
		addCustomMaterialDebug(debugFolder, floorMaterialSettings, this._resources, this._floorMaterial)
		addCustomMaterialDebug(debugFolder, roofMaterialSettings, this._resources, this._roofMaterial)
		addCustomMaterialDebug(debugFolder, poutreMaterialSettings, this._resources, this._poutreMaterial)
		addCustomMaterialDebug(debugFolder, lightMaterialSettings, this._resources, this._lightMaterial)

		// Light grid settings debug
		const lightGridFolder = debugFolder.addFolder({
			title: 'Light Grid Settings',
			expanded: false,
		})

		lightGridFolder
			.addBinding(this._lightGridSettings, 'xCount', {
				min: 1,
				max: 20,
				step: 1,
			})
			.on('change', () => {
				this._recreateLightInstances()
			})

		lightGridFolder
			.addBinding(this._lightGridSettings, 'zCount', {
				min: 1,
				max: 20,
				step: 1,
			})
			.on('change', () => {
				this._recreateLightInstances()
			})

		lightGridFolder
			.addBinding(this._lightGridSettings, 'xSpacing', {
				min: 0.5,
				max: 10,
				step: 0.1,
			})
			.on('change', () => {
				this._recreateLightInstances()
			})

		lightGridFolder
			.addBinding(this._lightGridSettings, 'zSpacing', {
				min: 0.5,
				max: 10,
				step: 0.1,
			})
			.on('change', () => {
				this._recreateLightInstances()
			})

		lightGridFolder
			.addBinding(this._lightGridSettings, 'yOffset', {
				min: -5,
				max: 15,
				step: 0.1,
			})
			.on('change', () => {
				this._recreateLightInstances()
			})

		// Start position settings
		const startPositionFolder = lightGridFolder.addFolder({
			title: 'Start Position',
			expanded: false,
		})

		startPositionFolder
			.addBinding(this._lightGridSettings.startPosition, 'x', {
				min: -20,
				max: 20,
				step: 0.1,
			})
			.on('change', () => {
				this._recreateLightInstances()
			})

		startPositionFolder
			.addBinding(this._lightGridSettings.startPosition, 'z', {
				min: -20,
				max: 20,
				step: 0.1,
			})
			.on('change', () => {
				this._recreateLightInstances()
			})

		addTransformDebug(debugFolder, this._model)
	}

	_setupLightFlicker() {
		if (!this._lightCubeInstancedMesh) return

		const instanceCount = this._lightGridSettings.xCount * this._lightGridSettings.zCount

		// Initialize flicker data for each light instance
		this._lightFlickerData = []
		for (let i = 0; i < instanceCount; i++) {
			this._lightFlickerData.push({
				isOn: true,
				originalMatrix: new Matrix4(),
				currentYOffset: 0,
			})

			// Store original matrix
			this._lightCubeInstancedMesh.getMatrixAt(i, this._lightFlickerData[i].originalMatrix)
		}

		this._startFlickerAnimation()
	}

	_startFlickerAnimation() {
		const flickerRandomLight = () => {
			if (!this._lightCubeInstancedMesh) return

			// Pick a random light index
			const randomIndex = Math.floor(Math.random() * this._lightFlickerData.length)
			const lightData = this._lightFlickerData[randomIndex]

			// Toggle the light state
			const targetYOffset = lightData.isOn ? 2 : 0 // Move up 2 units to hide in roof
			lightData.isOn = !lightData.isOn

			// Animate the Y position
			gsap.to(lightData, {
				currentYOffset: targetYOffset,
				duration: 0.1 + Math.random() * 0.2, // Random duration between 0.1-0.3s
				ease: 'power2.inOut',
				onUpdate: () => {
					// Create new matrix with updated Y position
					const matrix = lightData.originalMatrix.clone()
					const position = new Vector3()
					matrix.decompose(position, new Quaternion(), new Vector3())

					// Apply Y offset
					position.y += lightData.currentYOffset
					matrix.setPosition(position)

					// Update instance matrix
					this._lightCubeInstancedMesh.setMatrixAt(randomIndex, matrix)
					this._lightCubeInstancedMesh.instanceMatrix.needsUpdate = true
				},
			})
		}

		// Start the flicker loop
		const scheduleNextFlicker = () => {
			// Random interval between 0.5 and 3 seconds
			const nextFlickerTime = 0.5 + Math.random() * 2.5

			gsap.delayedCall(nextFlickerTime, () => {
				flickerRandomLight()
				scheduleNextFlicker() // Schedule next flicker
			})
		}

		// Start the first flicker after 1 second
		gsap.delayedCall(1, scheduleNextFlicker)
	}
}
