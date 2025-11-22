import addMaterialDebug from 'utils/addMaterialDebug.js'
import useTransformControls from 'utils/useTransformControls.js'
import { FolderApi } from '@tweakpane/core'
import { Object3D, Color, DirectionalLightHelper, PointLightHelper, SpotLightHelper } from 'three'

export default function addSpotLightDebug(folder, object, settings) {
	const title = object.name

	const debugFolder = folder.addFolder({
		title,
		expanded: false,
	})

	// Binding basic settings
	debugFolder.addBinding(settings.visible, 'value', { label: 'visible' }).on('change', (ev) => {
		object.visible = ev.value
	})

	// Create the helper and display it conditionally
	const helper = new SpotLightHelper(object, 0.5, 0xff0000)
	helper.visible = settings.helper.value
	object.parent.add(helper)
	helper.update()

	debugFolder.addBinding(settings.helper, 'value', { label: 'helper' }).on('change', (ev) => {
		helper.visible = ev.value
	})

	debugFolder.addBinding(settings.intensity, 'value', { label: 'intensity', min: 0, max: 100 }).on('change', (ev) => {
		object.intensity = ev.value
	})

	debugFolder.addBinding(settings.decay, 'value', { label: 'decay', min: 0, max: 2 }).on('change', (ev) => {
		object.decay = ev.value
	})

	debugFolder.addBinding(settings.distance, 'value', { label: 'distance', min: 0, max: 500 }).on('change', (ev) => {
		object.distance = ev.value
	})
	debugFolder.addBinding(settings.angle, 'value', { label: 'angle', min: 0, max: 3 }).on('change', (ev) => {
		object.angle = ev.value
	})
	debugFolder.addBinding(settings.penumbra, 'value', { label: 'penumbra', min: 0, max: 1 }).on('change', (ev) => {
		object.penumbra = ev.value
	})

	debugFolder.addBinding(settings.color, 'value', { label: 'color' }).on('change', (ev) => {
		object.color.set(ev.value)
	})

	debugFolder.addBlade({ view: 'separator' })

	debugFolder.addBinding(settings.castShadow, 'value', { label: 'castShadow' }).on('change', (ev) => {
		object.castShadow = ev.value
	})

	debugFolder.addBinding(settings.receiveShadow, 'value', { label: 'receiveShadow' }).on('change', (ev) => {
		object.receiveShadow = ev.value
	})

	debugFolder.addBlade({ view: 'separator' })

	// Transform controls for the light itself
	const controls = new useTransformControls(object, debugFolder)

	controls.addEventListener('change', () => {
		settings.position.value.x = object.position.x
		settings.position.value.y = object.position.y
		settings.position.value.z = object.position.z

		settings.rotation.value.x = object.rotation.x
		settings.rotation.value.y = object.rotation.y
		settings.rotation.value.z = object.rotation.z

		settings.scale.value.x = object.scale.x
		settings.scale.value.y = object.scale.y
		settings.scale.value.z = object.scale.z

		helper.update()
	})

	debugFolder.addBlade({ view: 'separator' })

	if (object.target) {
		const targetControls = new useTransformControls(object.target, debugFolder, 'transform control target')

		targetControls.addEventListener('change', () => {
			settings.targetPosition.value.x = object.target.position.x
			settings.targetPosition.value.y = object.target.position.y
			settings.targetPosition.value.z = object.target.position.z

			helper.update()
		})
	}

	// Button to copy settings to clipboard
	debugFolder.addButton({ title: 'Copy Settings to Clipboard' }).on('click', () => {
		const settingsString = JSON.stringify(settings, null, 4) // Pretty-print with 4 spaces
		navigator.clipboard.writeText(`export default ${settingsString}`)
		console.log('Spot Light Settings copied to clipboard!')
	})

	return debugFolder
}
