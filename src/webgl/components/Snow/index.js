import Experience from 'core/Experience.js'
import fragmentShader from './fragmentShader.frag'
import vertexShader from './vertexShader.vert'
import { BoxGeometry, Mesh, PlaneGeometry, ShaderMaterial, Vector3 } from 'three'
import addObjectDebug from 'utils/addObjectDebug.js'

export default class Snow {
	constructor() {
		this.experience = new Experience()
		this.scene = this.experience.scene
		this.debug = this.experience.debug

		this._createMesh()
	}

	_createMesh() {
		const geometry = new PlaneGeometry(2, 2)
		this._material = new ShaderMaterial({
			fragmentShader,
			vertexShader,
			uniforms: {
				uTime: { value: 0 },
			},
			visible: false,
		})
		this.mesh = new Mesh(geometry, this._material)
		this.scene.add(this.mesh)
	}

	displaySnow(value = true) {
		this._material.visible = value
	}

	update() {
		this.mesh.material.uniforms.uTime.value = this.experience.time.elapsed
	}
}
