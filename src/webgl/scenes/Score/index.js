import Experience from 'core/Experience.js'
import Cube from 'components/Cube/Cube.js'

export default class Score {
	constructor() {
		this.experience = new Experience()
		this.scene = this.experience.scene

		this.cube = new Cube()
	}
}
