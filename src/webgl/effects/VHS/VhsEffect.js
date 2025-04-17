import { Effect } from 'postprocessing'

import fragmentShader from './VhsFragment.frag'

export class VhsEffect extends Effect {
	constructor() {
		super('VhsEffect', fragmentShader)
	}
}
