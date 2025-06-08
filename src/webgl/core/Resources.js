import EventEmitter from 'core/EventEmitter.js'
import { CubeTexture, CubeTextureLoader, Object3D, Texture, TextureLoader, WebGLRenderer, RepeatWrapping } from 'three'
import Experience from 'core/Experience.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader'
import { Howl } from 'howler'

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
		dracoLoader.setDecoderPath('/draco/')
		this.loaders.gltfLoader.setDRACOLoader(dracoLoader)
		this.loaders.ktx2Loader = new KTX2Loader()
		this.loaders.ktx2Loader.setTranscoderPath('/basis/')
		this.loaders.ktx2Loader.detectSupport(new WebGLRenderer())
		this.loaders.textureLoader = new TextureLoader()
		this.loaders.cubeTextureLoader = new CubeTextureLoader()
		this.loaders.fbxLoader = new FBXLoader()
		this.loaders.exrLoader = new EXRLoader()
	}

	startLoading() {
		// Load each source
		for (const source of this.sources) {
			if (source.path instanceof Array) {
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
				default:
					console.error(`${source.path} is not a valid source type`)
					break
			}
		}
	}

	sourceError(source, error) {
		console.error(`Failed to load: ${source.name}`)

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

		if (source.flipY !== undefined && source.flipY) {
			file.flipY = source.flipY
		}
		if (source.repeatWrapping !== undefined && source.repeatWrapping) {
			file.wrapS = RepeatWrapping
			file.wrapT = RepeatWrapping
		}

		if (this.debug.active && this.debug.debugParams.ResourceLog)
			console.debug(
				`%c🖼️ ${source.name}%c loaded in ${source.loadTime}ms. (${this.loaded}/${this.toLoad})`,
				'font-weight: bold',
				'font-weight: normal',
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
			console.debug(`✅ Resources loaded!`)
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
