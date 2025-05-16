import Experience from 'core/Experience.js'
import { TransformControls } from 'three/addons/controls/TransformControls.js'
import * as THREE from 'three'

/**
 * Adds transform controls debugging functionality to a given 3D object within a folder interface.
 * @param {import('@tweakpane/core').FolderApi} folder - Tweakpane folder
 * @param {THREE.Object3D} object - 3D object to control
 * @returns {TransformControls} - The created transform controls
 */
export default function addTransformDebug(folder, object) {
    const experience = new Experience()
    const camera = experience.camera
    const canvas = experience.canvas
    const scene = experience.scene

    // Add a separator before transform controls
    folder.addBlade({
        view: 'separator',
    });

    // Create transform controls
    const transformControls = new TransformControls(camera.instance, canvas)
    transformControls.name = 'transformControl'
    transformControls.getHelper().devObject = true
    scene.add(transformControls.getHelper())

    // Attach to object
    transformControls.attach(object)
    transformControls.enabled = transformControls.getHelper().visible = false

    // Handle camera controls interaction
    let cameraControlsEnabled
    transformControls.addEventListener('dragging-changed', ({ value }) => {
        if (!transformControls.camera.controls) return
        if (value) {
            cameraControlsEnabled = transformControls.camera.controls.enabled
            transformControls.camera.controls.enabled = !value
        } else {
            if (cameraControlsEnabled !== undefined) {
                transformControls.camera.controls.enabled = !value
            }
        }
    })

    // Add control visibility toggle
    folder.addBinding(
        { visible: false },
        'visible',
        { label: 'Transform Controls' }
    ).on('change', ({ value }) => {
        transformControls.enabled = transformControls.getHelper().visible = value
    })

    // Current mode state
    const state = {
        currentMode: 'translate',
        copyButtonTitle: 'Copy Position'
    }

    // Add transform mode selector (translate, rotate, scale)
    folder.addBinding(transformControls, 'mode', {
        view: 'radiogrid',
        size: [3, 1],
        groupName: 'transformMode',
        cells: (x) => {
            const cells = ['Translate', 'Rotate', 'Scale']
            return {
                title: cells[x],
                value: cells[x].toLowerCase(),
            }
        },
    }).on('change', ({ value }) => {
        state.currentMode = value
        // Update visibility of value displays
        positionContainer.hidden = value !== 'translate'
        rotationContainer.hidden = value !== 'rotate'
        scaleContainer.hidden = value !== 'scale'

        // Update copy button title
        switch (value) {
            case 'translate':
                state.copyButtonTitle = 'Copy Position'
                break
            case 'rotate':
                state.copyButtonTitle = 'Copy Rotation'
                break
            case 'scale':
                state.copyButtonTitle = 'Copy Scale'
                break
        }
        copyButton.title = state.copyButtonTitle
    })

    // Create containers for each transform type
    const positionContainer = document.createElement('div')
    const rotationContainer = document.createElement('div')
    const scaleContainer = document.createElement('div')

    // Position display bindings
    const positionBinding = folder.addBinding(object, 'position', {
        label: 'position',
    })
    positionBinding.element.parentElement.appendChild(positionContainer)
    positionContainer.appendChild(positionBinding.element)

    // Rotation display bindings
    const rotationBinding = folder.addBinding(object, 'rotation', {
        label: 'rotation',
    })
    rotationBinding.element.parentElement.appendChild(rotationContainer)
    rotationContainer.appendChild(rotationBinding.element)
    rotationContainer.hidden = true

    // Scale display bindings
    const scaleBinding = folder.addBinding(object, 'scale', {
        label: 'scale',
    })
    scaleBinding.element.parentElement.appendChild(scaleContainer)
    scaleContainer.appendChild(scaleBinding.element)
    scaleContainer.hidden = true

    // Update bindings when object transforms
    transformControls.addEventListener('change', () => {
        positionBinding.refresh()
        rotationBinding.refresh()
        scaleBinding.refresh()
        object.helper?.update()
    })

    // Add copy button that changes based on mode
    const copyButton = folder.addButton({
        title: state.copyButtonTitle
    })

    copyButton.on('click', () => {
        let valueToCopy
        switch (state.currentMode) {
            case 'translate':
                const pos = object.position
                valueToCopy = `${pos.x.toFixed(3)},${pos.y.toFixed(3)},${pos.z.toFixed(3)}`
                break
            case 'rotate':
                const rot = object.rotation
                valueToCopy = `${rot.x.toFixed(3)},${rot.y.toFixed(3)},${rot.z.toFixed(3)}`
                break
            case 'scale':
                const scale = object.scale
                valueToCopy = `${scale.x.toFixed(3)},${scale.y.toFixed(3)},${scale.z.toFixed(3)}`
                break
        }

        navigator.clipboard.writeText(valueToCopy).then(() => {
            console.log(`${state.copyButtonTitle} copied to clipboard:`, valueToCopy)
        }).catch(err => {
            console.error(`Could not copy ${state.currentMode}: `, err)
        })
    })

    // Add a separator after transform controls
    folder.addBlade({
        view: 'separator',
    });

    return transformControls
} 