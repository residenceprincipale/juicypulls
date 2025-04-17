import { BlendFunction, Effect, EffectAttribute, RenderPass } from 'postprocessing'

import fragmentShader from './TransitionFragment.frag'
import Experience from 'core/Experience.js'
import { WebGLRenderTarget } from 'three'

export class TransitionEffect extends Effect {
	constructor() {
		super('TransitionEffect', fragmentShader)
	}
}
