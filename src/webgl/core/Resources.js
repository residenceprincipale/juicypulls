import EventEmitter from 'core/EventEmitter.js'
import { AudioLoader, CubeTexture, CubeTextureLoader, Object3D, Texture, TextureLoader, WebGLRenderer, RepeatWrapping } from 'three'
import Experience from 'core/Experience.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader'

export default class Resources extends EventEmitter {
	constructor(sources) {
		super()

		this.experience = new Experience()
		this.debug = this.experience.debug

		this.sources = sources

		/**
		 * @type {{[name: string]: Texture | CubeTexture | Object3D | AudioBuffer}}
		 */
		this.items = {}
		this.toLoad = this.sources.length
		this.loaded = 0
		this.errors = []

		if (this.toLoad === 0) {
			console.warn('No resources to load.')
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
		dracoLoader.setDecoderPath('/draco/')
		this.loaders.gltfLoader.setDRACOLoader(dracoLoader)
		this.loaders.ktx2Loader = new KTX2Loader()
		this.loaders.ktx2Loader.setTranscoderPath('/basis/')
		this.loaders.ktx2Loader.detectSupport(new WebGLRenderer())
		this.loaders.textureLoader = new TextureLoader()
		this.loaders.cubeTextureLoader = new CubeTextureLoader()
		this.loaders.audioLoader = new AudioLoader()
		this.loaders.fbxLoader = new FBXLoader()
		this.loaders.exrLoader = new EXRLoader()
	}

	startLoading() {
		if (this.debug.active && this.debug.debugParams.ResourceLog) {
			console.group('🖼️ Resources')
			console.debug('⏳ Loading resources...')
			this.totalStartTime = performance.now()
		}
		// Load each source
		for (const source of this.sources) {
			source.startTime = performance.now()
			if (source.path instanceof Array) {
				this.loaders.cubeTextureLoader.load(
					source.path,
					(file) => {
						this.sourceLoaded(source, file)
					},
					undefined, // progress callback (not supported for cube textures)
					(error) => {
						this.sourceError(source, error)
					}
				)
				continue
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
						(progress) => {
							this.sourceProgress(source, progress)
						},
						(error) => {
							this.sourceError(source, error)
						}
					)
					break
				case 'fbx':
					this.loaders.fbxLoader.load(
						source.path,
						(file) => {
							this.sourceLoaded(source, file)
						},
						(progress) => {
							this.sourceProgress(source, progress)
						},
						(error) => {
							this.sourceError(source, error)
						}
					)
					break
				//textures
				case 'exr':
					this.loaders.exrLoader.load(
						source.path,
						(file) => {
							this.sourceLoaded(source, file)
						},
						(progress) => {
							this.sourceProgress(source, progress)
						},
						(error) => {
							this.sourceError(source, error)
						}
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
						(progress) => {
							this.sourceProgress(source, progress)
						},
						(error) => {
							this.sourceError(source, error)
						}
					)
					break
				case 'ktx2':
					this.loaders.ktx2Loader.load(
						source.path,
						(file) => {
							this.sourceLoaded(source, file)
						},
						(progress) => {
							this.sourceProgress(source, progress)
						},
						(error) => {
							this.sourceError(source, error)
						}
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
						}
					)
					break
				//audio
				case 'mp3':
				case 'ogg':
				case 'wav':
					this.loaders.audioLoader.load(
						source.path,
						(file) => {
							this.sourceLoaded(source, file)
						},
						(progress) => {
							this.sourceProgress(source, progress)
						},
						(error) => {
							this.sourceError(source, error)
						}
					)
					break
				default:
					const errorMsg = `${source.path} is not a valid source type`
					console.error('❌ Asset Loading Error:', errorMsg)
					this.errors.push({
						source: source,
						error: errorMsg,
						timestamp: new Date().toISOString()
					})
					break
			}
		}
	}

	sourceProgress(source, progress) {
		if (this.debug.active && this.debug.debugParams.ResourceLog && progress.lengthComputable) {
			const percentage = Math.round((progress.loaded / progress.total) * 100)
			console.debug(`📊 ${source.name}: ${percentage}% loaded (${progress.loaded}/${progress.total} bytes)`)
		}
	}

	sourceError(source, error) {
		source.endTime = performance.now()
		source.loadTime = Math.floor(source.endTime - source.startTime)

		// Create detailed error information
		const errorDetails = {
			source: source,
			error: error,
			errorMessage: error?.message || 'Unknown error',
			path: source.path,
			name: source.name,
			loadTime: source.loadTime,
			timestamp: new Date().toISOString()
		}

		this.errors.push(errorDetails)

		// Log error with detailed information
		console.group('❌ Asset Loading Error')
		console.error(`Failed to load asset: ${source.name}`)
		console.error(`Path: ${source.path}`)
		console.error(`Type: ${source.path.split('.').pop()}`)
		console.error(`Attempt duration: ${source.loadTime}ms`)
		console.error('Error details:', error)

		// Check if file exists in public folder
		const fullPath = source.path.startsWith('/') ? source.path : `/${source.path}`
		console.error(`Expected file location: public${fullPath}`)

		// Suggest common fixes
		console.group('💡 Troubleshooting suggestions:')
		console.log('1. Check if the file exists in the public folder')
		console.log('2. Verify the file path and filename (case-sensitive)')
		console.log('3. Check file permissions')
		console.log('4. Ensure the file format is supported')
		console.log('5. Check browser network tab for HTTP errors')
		console.groupEnd()

		console.groupEnd()

		// Still increment loaded count to prevent hanging
		this.loaded++

		// Update loading bar
		if (this.loadingScreenElement) {
			this.loadingBarElement.style.transform = `scaleX(${this.loaded / this.toLoad})`
		}

		// Check if all resources are processed (loaded or failed)
		if (this.loaded === this.toLoad) {
			this.finishLoading()
		}
	}

	sourceLoaded(source, file) {
		const { name, path, type, startTime, ...rest } = source
		Object.assign(file, rest)
		this.items[source.name] = file
		file.name = source.name
		this.loaded++
		source.endTime = performance.now()
		source.loadTime = Math.floor(source.endTime - source.startTime)

		if (source.flipY !== undefined && source.flipY) {
			file.flipY = source.flipY
		}
		if (source.repeatWrapping !== undefined && source.repeatWrapping) {
			file.wrapS = RepeatWrapping;
			file.wrapT = RepeatWrapping;
		}

		if (this.debug.active && this.debug.debugParams.ResourceLog)
			console.debug(
				`%c🖼️ ${source.name}%c loaded in ${source.loadTime}ms. (${this.loaded}/${this.toLoad})`,
				'font-weight: bold',
				'font-weight: normal'
			)
		if (this.loadingScreenElement) {
			this.loadingBarElement.style.transform = `scaleX(${this.loaded / this.toLoad})`
		}

		if (this.loaded === this.toLoad) {
			this.finishLoading()
		}
	}

	finishLoading() {
		if (this.debug.active && this.debug.debugParams.ResourceLog) {
			const totalEndTime = performance.now()
			const totalLoadTime = totalEndTime - this.totalStartTime
			console.debug(`✅ Resources processed in ${totalLoadTime}ms!`)

			// Summary of loading results
			const successCount = this.toLoad - this.errors.length
			console.log(`📊 Loading Summary: ${successCount}/${this.toLoad} assets loaded successfully`)

			if (this.errors.length > 0) {
				console.warn(`⚠️  ${this.errors.length} assets failed to load:`)
				this.errors.forEach(error => {
					console.warn(`   - ${error.source.name} (${error.source.path})`)
				})
			}

			console.groupEnd()
		}

		if (this.loadingScreenElement) this.loadingScreenElement.remove()

		// Emit ready event with error information
		this.trigger('ready', {
			loadedCount: this.toLoad - this.errors.length,
			totalCount: this.toLoad,
			errors: this.errors
		})
	}

	// Utility method to get loading errors
	getErrors() {
		return this.errors
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
