import { BlendFunction, Effect, EffectAttribute, RenderPass } from 'postprocessing'

import fragmentShader from './TransitionFragment.frag'

export class TransitionEffect extends Effect {
	constructor() {
		super('TransitionEffect', fragmentShader)
	}
}
