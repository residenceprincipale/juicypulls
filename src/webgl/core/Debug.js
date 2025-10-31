import { Pane } from 'tweakpane'
import * as TweakpaneEssentialsPlugin from '@tweakpane/plugin-essentials'
import * as TweakpanePluginMedia from 'tweakpane-plugin-media'
import * as TweakpaneFileImportPlugin from 'tweakpane-plugin-file-import'
import Stats from 'stats.js'
import Experience from 'core/Experience.js'
import addUndoRedoFeature from 'tweakpane-undo-redo-plugin'
import * as Tweakpane from 'tweakpane'

addUndoRedoFeature(Tweakpane)

/**
 * Debug class with Tweakpane folder state persistence
 *
 * Features:
 * - Automatically saves and restores expanded/collapsed state of all Tweakpane folders
 * - All folders default to collapsed (expanded: false) on first creation
 * - Folder states are saved to localStorage and persist between page reloads
 * - Supports nested folders with hierarchical path-based keys
 * - Includes debug controls to view and clear saved states
 *
 * Usage:
 * - Folders will automatically have their states managed
 * - Use "Show Folder States" button in Debug Feature Manager to see all tracked folders
 * - Use "Clear Folder States" button to reset all folders to default state
 */
export default class Debug {
	constructor() {
		this.experience = new Experience()
		this.active = window.location.hash.includes('#debug')
		this.tutorialActive = window.location.hash.includes('tutorial')

		if (this.active) {
			// Create the debug pane with the title
			this.ui = new Pane({
				title: '⚙️ Debug',
				expanded: true,
			})

			// Initialize folder state management
			this.folderStates = new Map()
			this.initializeFolderStateManager()

			// Retrieve the expanded state from localStorage, default to false
			let expanded = false
			const storedExpanded = localStorage.getItem('debugPaneExpanded')
			if (storedExpanded !== null) {
				expanded = storedExpanded === 'true' // localStorage stores strings
			} else {
				// If not present, initialize it in localStorage
				localStorage.setItem('debugPaneExpanded', 'false')
			}

			this.ui.expanded = expanded // apply later for "this.ui.containerEl_" defined
			this.ui.element.addEventListener('click', () => {
				localStorage.setItem('debugPaneExpanded', this.ui.expanded.toString())
			})

			const uiContainer = this.ui.containerElem_
			const uiBindContainer = uiContainer.querySelector('.tp-rotv_c')
			uiContainer.style.position = 'fixed'
			uiContainer.style.userSelect = 'none'
			uiContainer.style.zIndex = '1000'
			uiBindContainer.style.maxHeight = '80vh'
			uiBindContainer.style.overflowY = 'auto'

			this.setPlugins()
			this.setImportExportButtons()
			this.setMoveEvent()
			this.setResizeEvent()
			this.setResetButton()
			this.restorePosition() // Restore saved position after UI setup

			this.setDebugManager()

			if (this.debugParams.SceneLog) this.setSceneLog()
			if (this.debugParams.Stats) this.setStats()
		} else {
			sessionStorage.removeItem('debugParams')
		}
	}

	/**
	 * Initialize folder state management system
	 */
	initializeFolderStateManager() {
		// Load saved folder states from localStorage
		const savedStates = localStorage.getItem('tweakpaneFolderStates')
		let loadedStatesCount = 0

		if (savedStates) {
			try {
				const statesData = JSON.parse(savedStates)
				Object.entries(statesData).forEach(([key, value]) => {
					this.folderStates.set(key, value)
					loadedStatesCount++
				})
			} catch (error) {
				console.warn('Failed to parse saved folder states:', error)
				localStorage.removeItem('tweakpaneFolderStates')
			}
		}

		// console.log(`📁 Tweakpane folder state management initialized (${loadedStatesCount} saved states loaded)`)

		// Override the addFolder method on the main UI
		this.wrapAddFolderMethod(this.ui, 'root')
	}

	/**
	 * Wrap the addFolder method for any folder/pane instance
	 */
	wrapAddFolderMethod(target, parentPath = '') {
		const self = this

		if (target.addFolder && !target.addFolder._tweakpaneWrapped) {
			const originalAddFolder = target.addFolder.bind(target)

			target.addFolder = function (params) {
				// Generate unique key for this folder based on its hierarchy
				const folderTitle = params.title || 'untitled'
				const folderPath = parentPath ? `${parentPath}/${folderTitle}` : folderTitle
				const folderKey = self.generateFolderKey(folderPath)

				// Get saved state or use explicit setting, defaulting to false
				const savedExpanded = self.folderStates.get(folderKey)
				let expanded

				if (savedExpanded !== undefined) {
					// Use saved state if it exists
					expanded = savedExpanded
				} else if (params.expanded === true) {
					// Respect explicit expanded: true on first creation
					expanded = true
				} else {
					// Default to collapsed
					expanded = false
				}

				// Override the expanded parameter
				const folderParams = {
					...params,
					expanded: expanded,
				}

				// Create the folder with the managed state
				const folder = originalAddFolder(folderParams)

				// Track this folder
				self.trackFolder(folder, folderKey)

				// Wrap addFolder method for this new folder instance to handle nested folders
				self.wrapAddFolderMethod(folder, folderPath)

				return folder
			}

			// Mark as wrapped to avoid double wrapping
			target.addFolder._tweakpaneWrapped = true
		}
	}

	/**
	 * Wrap the addFolder method for folder instances to handle nested folders
	 */
	wrapFolderAddMethod() {
		// This method is now replaced by the more robust wrapAddFolderMethod
		// Keeping for backward compatibility but it's not used anymore
	}

	/**
	 * Generate a unique key for a folder based on its title and hierarchy
	 */
	generateFolderKey(path) {
		// Clean the path and make it a valid key
		return path
			.toLowerCase()
			.replace(/[^a-z0-9\/]/g, '_')
			.replace(/\/+/g, '/')
			.replace(/^\/|\/$/g, '')
	}

	/**
	 * Track a folder and set up event listeners for state changes
	 */
	trackFolder(folder, folderKey) {
		// Store initial state
		this.folderStates.set(folderKey, folder.expanded)

		// Listen for expand/collapse changes
		if (folder.controller && folder.controller.foldable) {
			folder.controller.foldable.emitter.on('change', () => {
				this.folderStates.set(folderKey, folder.expanded)
				this.saveFolderStates()
			})
		}

		// Alternative approach: listen to the folder's expanded property directly
		if (folder.expanded !== undefined) {
			// Create a more robust event listener
			const checkExpandedState = () => {
				const currentState = folder.expanded
				if (this.folderStates.get(folderKey) !== currentState) {
					this.folderStates.set(folderKey, currentState)
					this.saveFolderStates()
				}
			}

			// Use MutationObserver to watch for DOM changes that indicate folder state changes
			if (folder.element) {
				const observer = new MutationObserver(() => {
					// Small delay to ensure state has updated
					setTimeout(checkExpandedState, 10)
				})

				observer.observe(folder.element, {
					attributes: true,
					attributeFilter: ['class'],
					subtree: true,
				})
			}
		}
	}

	/**
	 * Save all folder states to localStorage
	 */
	saveFolderStates() {
		const statesObject = Object.fromEntries(this.folderStates)
		localStorage.setItem('tweakpaneFolderStates', JSON.stringify(statesObject))
	}

	/**
	 * Debug method to show all tracked folder states
	 */
	showFolderStates() {
		console.log('📁 Tracked folder states:')
		this.folderStates.forEach((expanded, key) => {
			console.log(`  ${key}: ${expanded ? '🔽 expanded' : '▶️ collapsed'}`)
		})
	}

	/**
	 * Clear all saved folder states
	 */
	clearFolderStates() {
		this.folderStates.clear()
		localStorage.removeItem('tweakpaneFolderStates')
		console.log('🗑️ Cleared all folder states')
	}

	setPlugins() {
		this.ui.registerPlugin(TweakpaneEssentialsPlugin)
		this.ui.registerPlugin(TweakpanePluginMedia)
		this.ui.registerPlugin(TweakpaneFileImportPlugin)
	}

	setImportExportButtons() {
		const handleExport = () => {
			const data = this.ui.exportState()
			const element = document.createElement('a')
			const file = new Blob([JSON.stringify(data)], {
				type: 'application/json',
			})
			element.href = URL.createObjectURL(file)
			element.download = 'preset.json'
			document.body.appendChild(element) // Required for this to work in FireFox
			element.click()
			element.remove()
		}

		const handleImport = () => {
			const input = document.createElement('input')
			input.type = 'file'
			input.accept = '.json'
			input.onchange = (event) => {
				const file = event.target.files[0]
				const reader = new FileReader()
				reader.onload = (event) => {
					const data = JSON.parse(event.target.result)
					this.ui.importState(data)
				}
				reader.readAsText(file)
			}
			input.click()
		}

		// this.ui
		// 	.addBlade({
		// 		view: 'buttongrid',
		// 		size: [2, 1],
		// 		cells: (x, y) => ({
		// 			title: [['Import', 'Export']][y][x],
		// 		}),
		// 	})
		// 	.on('click', (event) => {
		// 		if (event.index[0] === 0) {
		// 			handleImport()
		// 			return
		// 		}
		// 		handleExport()
		// 	})
	}

	setMoveEvent() {
		const container = this.ui.containerElem_
		const titleElement = this.ui.element.children[0]
		titleElement.childNodes.forEach((child) => {
			child.style.pointerEvents = 'none'
		})
		let move = () => {}
		let hasMoved = true
		const handleMouseDown = (event) => {
			titleElement.style.cursor = 'grabbing'
			const clickTargetX = event.layerX
			const clickTargetWidth = event.target.clientWidth
			const clickTargetY = event.layerY

			move = ({ clientX, clientY }) => {
				hasMoved = true

				const rightPos = this.experience.sizes.width - clientX - (clickTargetWidth - clickTargetX)
				const topPos = clientY - clickTargetY

				// Apply bounds checking
				const boundedPosition = this.getBoundedPosition(rightPos, topPos)

				container.style.right = `${boundedPosition.right}px`
				container.style.top = `${boundedPosition.top}px`

				// Save position to localStorage
				this.savePosition(boundedPosition.right, boundedPosition.top)
			}

			document.addEventListener('mousemove', move)
		}
		const handleMouseUp = () => {
			titleElement.style.cursor = null

			if (hasMoved) {
				this.ui.controller.foldable.set('expanded', !this.ui.controller.foldable.get('expanded'))
				hasMoved = false
			}

			document.removeEventListener('mousemove', move)
		}

		titleElement.addEventListener('mousedown', handleMouseDown)
		titleElement.addEventListener('mouseup', handleMouseUp)
	}

	getBoundedPosition(right, top) {
		const container = this.ui.containerElem_
		const containerRect = container.getBoundingClientRect()
		const windowWidth = this.experience.sizes.width
		const windowHeight = this.experience.sizes.height

		// Minimum visible area (at least 50px of the pane should be visible)
		const minVisibleWidth = 50
		const minVisibleHeight = 30

		// Bound the right position (prevent going too far right or left)
		const maxRight = windowWidth - minVisibleWidth
		const minRight = -(containerRect.width - minVisibleWidth)
		const boundedRight = Math.max(minRight, Math.min(maxRight, right))

		// Bound the top position (prevent going above screen or below screen)
		const maxTop = windowHeight - minVisibleHeight
		const minTop = 0
		const boundedTop = Math.max(minTop, Math.min(maxTop, top))

		return {
			right: boundedRight,
			top: boundedTop,
		}
	}

	savePosition(right, top) {
		const position = { right, top }
		localStorage.setItem('debugPanePosition', JSON.stringify(position))
	}

	restorePosition() {
		const savedPosition = localStorage.getItem('debugPanePosition')
		if (savedPosition) {
			try {
				const position = JSON.parse(savedPosition)
				const container = this.ui.containerElem_

				// Apply bounds checking to saved position in case screen size changed
				const boundedPosition = this.getBoundedPosition(position.right, position.top)

				container.style.right = `${boundedPosition.right}px`
				container.style.top = `${boundedPosition.top}px`
			} catch (error) {
				console.warn('Failed to restore debug pane position:', error)
				// If parsing fails, remove the corrupted data
				localStorage.removeItem('debugPanePosition')
			}
		}
	}

	setResizeEvent() {
		const containerElement = this.ui.containerElem_
		containerElement.style.minWidth = '280px'

		const styleElement = document.createElement('style')
		styleElement.innerHTML = `
		.tp-lblv_v { flex-grow: 1 }
		.tp-lblv_l { min-width: 64px; max-width: 100px;}
		.horizontal-resize { position: absolute; left: -3px; top: 0; bottom: 0; width: 5px; cursor: ew-resize; }
		.horizontal-resize:hover { background-color: #ffffff10; }
		`
		document.head.appendChild(styleElement)

		const horizontalResizeElement = document.createElement('div')
		horizontalResizeElement.classList.add('horizontal-resize')
		containerElement.appendChild(horizontalResizeElement)

		horizontalResizeElement.addEventListener('mousedown', (event) => {
			containerElement.style.pointerEvents = 'none'
			const clickTargetX = event.clientX
			const clickTargetWidth = containerElement.clientWidth

			const handleMouseMove = ({ clientX }) => {
				containerElement.style.width = `${clickTargetWidth - (clientX - clickTargetX)}px`
			}

			const handleMouseUp = () => {
				document.removeEventListener('mousemove', handleMouseMove)
				document.removeEventListener('mouseup', handleMouseUp)
				containerElement.style.pointerEvents = ''
			}

			document.addEventListener('mousemove', handleMouseMove)
			document.addEventListener('mouseup', handleMouseUp)
		})
	}

	setResetButton() {
		const resetButton = document.createElement('button')
		resetButton.classList.add('tp-reset-button')
		const styleElement = document.createElement('style')
		styleElement.innerHTML = `
			.tp-reset-button {
				position: absolute;
				right: 0;
				top: 0;
				bottom: 0;
				width: 16px;
				height: 16px;
				margin: auto;
				stroke: #65656e;
				stroke-linecap: round;
				stroke-linejoin: round;
				stroke-width: 2;
				fill: none;
				background: none;
				border: none;
				cursor: pointer;
			}
			.tp-reset-button:hover {
				stroke: var(--btn-bg-h);
			}
		`
		document.head.appendChild(styleElement)

		resetButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M21 12a9 9 0 0 0-9-9C9 3 7 4 5 6L3 8m0 0V3m0 5h5m-5 4a9 9 0 0 0 9 9c3 0 5-1 7-3l2-2m0 0h-5m5 0v5"/></svg>`

		this.ui.pool_.createBindingApi = (function (original) {
			return function (bindingController) {
				const valueElement = bindingController.view.valueElement
				valueElement.style.position = 'relative'
				valueElement.style.paddingRight = '20px'
				const clonedResetButton = resetButton.cloneNode(true)
				valueElement.appendChild(clonedResetButton)

				const initialValue = bindingController.valueController.value.rawValue
				bindingController.value.emitter.on('change', ({ rawValue }) => {
					if (JSON.stringify(rawValue) === JSON.stringify(initialValue)) {
						clonedResetButton.style.stroke = ''
						return
					}
					clonedResetButton.style.stroke = 'var(--btn-bg-a)'
				})

				clonedResetButton.addEventListener('click', () => {
					bindingController.valueController.value.setRawValue(initialValue)
				})

				return original.apply(this, arguments)
			}
		})(this.ui.pool_.createBindingApi)
	}

	setDebugManager() {
		this.debugParams = {
			SceneLog: false,
			ResourceLog: true,
			Stats: true,
			LoadingScreen: true,
		}
		this.debugParams = JSON.parse(sessionStorage.getItem('debugParams')) || this.debugParams

		const debugManager = this.ui.addFolder({
			title: 'Debug Feature Manager',
			expanded: false,
		})

		const handleReset = () => {
			Object.keys(this.debugParams).forEach((key, index) => {
				this.debugParams[key] = true
				debugManager.children[index + 1].refresh()
			})
		}

		debugManager.addButton({ title: 'Reset Debug Manager' }).on('click', handleReset)

		Object.keys(this.debugParams).forEach((key) => {
			debugManager.addBinding(this.debugParams, key).on('change', ({ value }) => {
				sessionStorage.setItem('debugParams', JSON.stringify(this.debugParams))
				if (value) {
					if (this[`set${key}`]) this[`set${key}`]()
				} else {
					if (this[`unset${key}`]) this[`unset${key}`]()
				}
			})
		})

		// Add folder state management controls
		debugManager.addBlade({
			view: 'separator',
		})

		debugManager.addButton({ title: 'Show Folder States' }).on('click', () => {
			this.showFolderStates()
		})

		debugManager.addButton({ title: 'Clear Folder States' }).on('click', () => {
			this.clearFolderStates()
		})
	}

	setSceneLog() {
		// debug message when something is added to the scene
		this.experience.scene.add = (function (original) {
			return function (object) {
				if (!object.devObject) {
					console.debug(
						`📦 %c${object.name ? object.name : `unnamed ${object.type}`}%c added to the scene`,
						'font-weight: bold; background-color: #ffffff20; padding: 0.1rem 0.3rem; border-radius: 0.3rem',
						'font-weight: normal',
						object,
					)
				}
				return original.apply(this, arguments)
			}
		})(this.experience.scene.add)
	}

	setStats() {
		this.statsJsPanel = new Stats()
		document.body.appendChild(this.statsJsPanel.domElement)
		const monitoringValues = [
			{
				name: 'Calls',
				value: () => this.experience.renderer.instance.info.render.calls,
			},
			{
				name: 'Triangles',
				value: () => this.experience.renderer.instance.info.render.triangles,
			},
			{
				name: 'Lines',
				value: () => this.experience.renderer.instance.info.render.lines,
			},
			{
				name: 'Points',
				value: () => this.experience.renderer.instance.info.render.points,
			},
			{
				name: 'Geometries',
				value: () => this.experience.renderer.instance.info.memory.geometries,
			},
			{
				name: 'Materials',
				value: () => this.experience.renderer.instance.info.programs.length,
			},
			{
				name: 'Textures',
				value: () => this.experience.renderer.instance.info.memory.textures,
			},
		]

		this.monitoringSection = document.createElement('section')
		Object.assign(this.monitoringSection.style, {
			position: 'fixed',
			bottom: '1rem',
			left: '1rem',
			pointerEvents: 'none',
			userSelect: 'none',
			zIndex: '1000',
			display: 'flex',
			gap: '1rem',
			fontSize: '12px',
			mixBlendMode: 'difference',
		})

		monitoringValues.forEach((monitoringValue) => {
			const monitoringValueElement = document.createElement('span')
			monitoringValueElement.id = monitoringValue.name.toLowerCase()
			monitoringValue.element = monitoringValueElement
			this.monitoringSection.appendChild(monitoringValueElement)
		})

		document.body.appendChild(this.monitoringSection)

		this.stats = {
			monitoringValues,
			update: () => {
				this.statsJsPanel.update()
				monitoringValues.forEach((monitoringValue) => {
					if (monitoringValue.value() === monitoringValue.lastValue) return
					monitoringValue.lastValue = monitoringValue.value()
					monitoringValue.element.innerHTML = `<b>${monitoringValue.lastValue}</b> ${monitoringValue.name}`
				})
			},
		}
	}
	unsetStats() {
		this.statsJsPanel.domElement.remove()
		this.monitoringSection.remove()
	}

	update() {
		if (this.active) {
			if (this.debugParams.Stats) this.stats.update()
		}
	}
}
