import EventEmitter from 'core/EventEmitter.js'
import { CubeTexture, CubeTextureLoader, Object3D, Texture, TextureLoader, WebGLRenderer, RepeatWrapping } from 'three'
import Experience from 'core/Experience.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader'
import { FontLoader } from 'three/addons/loaders/FontLoader.js'
import { Howl } from 'howler'
import { VideoTexture } from 'three'

// play() all loaded videos once with first user interaction
const VIDEOS_ARRAY = []
const DOCUMENT_CLICK_LISTENER = document.addEventListener(
	'click',
	() => {
		VIDEOS_ARRAY.forEach((video) => {
			video.play()
		})
	},
	{ once: true },
)

export default class Resources extends EventEmitter {
	constructor(sources) {
		super()

		this.experience = new Experience()
		this.debug = this.experience.debug

		this.sources = sources

		/**
		 * @type {{[name: string]: Texture | CubeTexture | Object3D | {src: string, type: string}}}
		 */
		this.items = {}
		this.toLoad = this.sources.length
		this.loaded = 0

		// Asset size logging control - set to false to disable file size fetching and detailed logging
		this.enableAssetSizeLogging = false

		if (this.toLoad === 0) {
			this.trigger('ready')
			return
		}

		if (!this.debug.active || this.debug.debugParams.LoadingScreen) {
			this.setLoadingScreen()
		}
		this.setLoaders()
		this.startLoading()
	}

	setLoadingScreen() {
		const loadingScreenStyles = {
			position: 'fixed',
			top: 0,
			left: 0,
			width: '100%',
			height: '100%',
			background: '#000',
			zIndex: 100,
		}
		const loadingBarStyles = {
			position: 'fixed',
			top: '50%',
			left: '25%',
			width: '50%',
			margin: 'auto',
			height: '2px',
			background: 'white',
			zIndex: 100,
			transformOrigin: 'left',
			transform: 'scaleX(0)',
		}
		this.loadingScreenElement = document.createElement('div')
		Object.assign(this.loadingScreenElement.style, loadingScreenStyles)
		this.loadingBarElement = document.createElement('div')
		Object.assign(this.loadingBarElement.style, loadingBarStyles)
		this.loadingScreenElement.appendChild(this.loadingBarElement)
		document.body.appendChild(this.loadingScreenElement)
	}

	setLoaders() {
		this.loaders = {}
		this.loaders.gltfLoader = new GLTFLoader()
		const dracoLoader = new DRACOLoader()
		dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/')
		this.loaders.gltfLoader.setDRACOLoader(dracoLoader)
		this.loaders.ktx2Loader = new KTX2Loader()
		this.loaders.ktx2Loader.setTranscoderPath('/basis/')
		this.loaders.ktx2Loader.detectSupport(new WebGLRenderer())
		this.loaders.textureLoader = new TextureLoader()
		this.loaders.cubeTextureLoader = new CubeTextureLoader()
		this.loaders.fbxLoader = new FBXLoader()
		this.loaders.exrLoader = new EXRLoader()
		this.loaders.fontLoader = new FontLoader()
	}

	// Method to fetch file size
	async getFileSize(url) {
		try {
			const response = await fetch(url, { method: 'HEAD' })
			const contentLength = response.headers.get('content-length')
			return contentLength ? parseInt(contentLength) : null
		} catch (error) {
			console.warn(`Could not fetch size for ${url}:`, error)
			return null
		}
	}

	// Method to format file size
	formatFileSize(bytes) {
		if (bytes === null || bytes === undefined) return 'Unknown size'
		if (bytes === 0) return '0 B'

		const k = 1024
		const sizes = ['B', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))

		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	startLoading() {
		// Load each source
		for (const source of this.sources) {
			// Add start time for loading duration (only when asset logging is enabled)
			if (this.debug.active && this.debug.debugParams.ResourceLog && this.enableAssetSizeLogging) {
				source.startTime = performance.now()
			}

			if (source.path instanceof Array) {
				// For cube textures, get the size of the first face as an estimate (only when asset logging is enabled)
				if (this.debug.active && this.debug.debugParams.ResourceLog && this.enableAssetSizeLogging) {
					this.getFileSize(source.path[0]).then((size) => {
						source.fileSize = size ? size * 6 : null // Multiply by 6 for all faces
					})
				}

				this.loaders.cubeTextureLoader.load(
					source.path,
					(file) => {
						this.sourceLoaded(source, file)
					},
					undefined, // progress callback (not supported for cube textures)
					(error) => {
						this.sourceError(source, error)
					},
				)
				continue
			}

			// Get file size for single file assets (only when asset logging is enabled)
			if (this.debug.active && this.debug.debugParams.ResourceLog && this.enableAssetSizeLogging) {
				this.getFileSize(source.path).then((size) => {
					source.fileSize = size
				})
			}

			switch (source.path.split('.').pop()) {
				//models
				case 'gltf':
				case 'glb':
					this.loaders.gltfLoader.load(
						source.path,
						(file) => {
							this.sourceLoaded(source, file)
						},
						undefined,
						(error) => {
							this.sourceError(source, error)
						},
					)
					break
				case 'fbx':
					this.loaders.fbxLoader.load(
						source.path,
						(file) => {
							this.sourceLoaded(source, file)
						},
						undefined,
						(error) => {
							this.sourceError(source, error)
						},
					)
					break
				//textures
				case 'exr':
					this.loaders.exrLoader.load(
						source.path,
						(file) => {
							this.sourceLoaded(source, file)
						},
						undefined,
						(error) => {
							this.sourceError(source, error)
						},
					)
					break
				case 'png':
				case 'jpg':
				case 'jpeg':
				case 'webp':
					this.loaders.textureLoader.load(
						source.path,
						(file) => {
							this.sourceLoaded(source, file)
						},
						undefined,
						(error) => {
							this.sourceError(source, error)
						},
					)
					break
				case 'ktx2':
					this.loaders.ktx2Loader.load(
						source.path,
						(file) => {
							this.sourceLoaded(source, file)
						},
						undefined,
						(error) => {
							this.sourceError(source, error)
						},
					)
					break
				case 'cubeTexture':
					this.loaders.cubeTextureLoader.load(
						source.path,
						(file) => {
							this.sourceLoaded(source, file)
						},
						undefined, // progress callback (not supported for cube textures)
						(error) => {
							this.sourceError(source, error)
						},
					)
					break
				//audio
				case 'mp3':
				case 'ogg':
				case 'wav':
					const audio = new Howl({
						src: [source.path],
						loop: source.loop || false,
						volume: source.volume || 1,
						autoplay: source.autoplay || false,
					})
					this.sourceLoaded(source, audio)
					break
				//video
				case 'mp4':
				case 'mov':
					const videoElement = document.createElement('video')
					videoElement.src = source.path
					videoElement.muted = 'true'
					videoElement.autoplay = 'true'
					videoElement.playsinline = 'true'
					videoElement.loop = 'true'
					videoElement.style.display = 'none'

					videoElement.addEventListener('play', function () {
						this.currentTime = 0.01
					})
					VIDEOS_ARRAY.push(videoElement)

					const videoTexture = new VideoTexture(videoElement)
					this.sourceLoaded(source, videoTexture)
					break
				//font (for MSDF)
				case 'json':
					this.loaders.fontLoader.load(
						source.path,
						(file) => {
							this.sourceLoaded(source, file)
						},
						undefined,
						(error) => {
							this.sourceError(source, error)
						},
					)
					break
				default:
					console.error(`${source.path} is not a valid source type`)
					break
			}
		}
	}

	sourceError(source, error) {
		console.error(`Failed to load resource: ${source.name}`)
		console.error(`Resource path: ${source.path}`)
		console.error(`Resource type: ${source.type || 'auto-detected'}`)
		console.error(`Original error:`, error)

		this.loaded++

		// Update loading bar
		if (this.loadingScreenElement) {
			this.loadingBarElement.style.transform = `scaleX(${this.loaded / this.toLoad})`
		}

		// Check if all resources are processed
		if (this.loaded === this.toLoad) {
			this.finishLoading()
		}
	}

	sourceLoaded(source, file) {
		const { name, path, type, ...rest } = source
		Object.assign(file, rest)
		this.items[source.name] = file
		file.name = source.name
		this.loaded++

		// Calculate loading time
		const loadTime = source.startTime ? Math.round(performance.now() - source.startTime) : 0

		if (source.flipY !== undefined && source.flipY) {
			file.flipY = source.flipY
		}
		if (source.repeatWrapping !== undefined && source.repeatWrapping) {
			file.wrapS = RepeatWrapping
			file.wrapT = RepeatWrapping
		}

		// Enhanced logging with file size
		if (this.debug.active && this.debug.debugParams.ResourceLog) {
			if (this.enableAssetSizeLogging) {
				const sizeInfo = this.formatFileSize(source.fileSize)
				const fileType = source.path.split('.').pop().toUpperCase()

				console.debug(
					`%c📦 ${source.name}%c [${fileType}] - ${sizeInfo} - loaded in ${loadTime}ms (${this.loaded}/${this.toLoad})`,
					'font-weight: bold; color: white',
					'font-weight: normal; color: #ccc',
				)
			} else {
				// Simple logging without file size
				console.debug(
					`%c🖼️ ${source.name}%c loaded (${this.loaded}/${this.toLoad})`,
					'font-weight: bold; color: white',
					'font-weight: normal; color: #ccc',
				)
			}
		}

		if (this.loadingScreenElement) {
			this.loadingBarElement.style.transform = `scaleX(${this.loaded / this.toLoad})`
		}

		if (this.loaded === this.toLoad) {
			this.finishLoading()
		}
	}

	finishLoading() {
		if (this.debug.active && this.debug.debugParams.ResourceLog) {
			console.debug(`✅ Resources loaded!`)

			// Log detailed summary only if asset size logging is enabled
			if (this.enableAssetSizeLogging) {
				// Log summary of all assets with sizes
				const assetSummary = this.sources
					.map((source) => ({
						name: source.name,
						size: source.fileSize,
						type: source.path.split('.').pop().toUpperCase(),
					}))
					.sort((a, b) => (b.size || 0) - (a.size || 0)) // Sort by size descending

				console.group('📊 Asset Size Summary (Heaviest First):')
				assetSummary.forEach((asset) => {
					const sizeStr = this.formatFileSize(asset.size)
					const isLarge = asset.size && asset.size > 1024 * 1024 // > 1MB
					console.log(
						`%c${asset.name}%c [${asset.type}] - ${sizeStr}`,
						isLarge ? 'color: #FF6B6B; font-weight: bold' : 'color: white',
						'color: #ccc',
					)
				})
				console.groupEnd()

				// Calculate total size
				const totalSize = this.sources.reduce((sum, source) => sum + (source.fileSize || 0), 0)
				console.log(`%cTotal assets size: ${this.formatFileSize(totalSize)}`, 'font-weight: bold; color: white')
			}
		}

		if (this.loadingScreenElement) this.loadingScreenElement.remove()

		this.trigger('ready')
	}

	// Utility method to check if a specific asset loaded successfully
	hasAsset(name) {
		return this.items.hasOwnProperty(name)
	}

	// Utility method to get asset with fallback
	getAsset(name, fallback = null) {
		return this.items[name] || fallback
	}
}
