import Experience from 'core/Experience.js'
import { Crowd } from 'recast-navigation'
import { CrowdHelper, NavMeshHelper, threeToSoloNavMesh } from '@recast-navigation/three'
import { Mesh, Vector3 } from 'three'
import AnimationController from 'utils/AnimationController.js'

export default class Nav {
	constructor() {
		this.experience = new Experience()
		this.scene = this.experience.scene
		this.debug = this.experience.debug

		this.mob = this.experience.scene.resources.items.mobModel
		console.log(this.mob)
		this.scene.add(this.mob.scene)

		this.animationContoller = new AnimationController({ animations: this.mob.animations, model: this.mob.scene })

		this.animationContoller.playAnimation('zombie walk', { loop: true })
		const meshes = []
		this.scene.traverse((child) => {
			if (child instanceof Mesh) {
				meshes.push(child)
			}
		})
		const { success, navMesh } = threeToSoloNavMesh(meshes)

		if (success) {
			const navMeshHelper = new NavMeshHelper(navMesh)

			// this.scene.add(navMeshHelper)
		}

		this.crowd = new Crowd(navMesh, { maxAgents: 1, maxAgentRadius: 1 })
		this.crowdHelper = new CrowdHelper(this.crowd)

		// this.scene.add(this.crowdHelper)

		const position = new Vector3(-2, 0, 0)

		this.agent = this.crowd.addAgent(position, {
			radius: 0.5,
			height: 1,
			maxAcceleration: 1.0,
			maxSpeed: 1.0,
		})

		const targetPosition = new Vector3(2, 0, 0)
		this.agent.requestMoveTarget(targetPosition)

		setInterval(() => {
			this.agent.requestMoveTarget(new Vector3().random().multiplyScalar(4).subScalar(2))
			console.log('new target')
		}, 10000)
	}

	update() {
		if (this.crowd) {
			this.crowd.update(this.experience.time.delta / 1000)
			const position = new Vector3().copy(this.crowd.getAgent(0).position())

			const lastPosition = this.lastPosition || new Vector3()
			const direction = position.clone().sub(lastPosition).normalize()
			const targetRotation = Math.atan2(direction.x, direction.z)
			this.mob.scene.rotation.y += (targetRotation - this.mob.scene.rotation.y) * 0.1
			const velocity = new Vector3().copy(this.crowd.getAgent(0).velocity())
			const velocityLength = velocity.length()
			//if velocity is zero, set animation to idle
			if (velocityLength > 0.2) {
				if (this.currentAnimation !== 'zombie walk') {
					this.animationContoller.fadeAnimation('zombie walk', { loop: true })
					this.currentAnimation = 'zombie walk'
				}
			} else {
				if (this.currentAnimation !== 'zombie idles') {
					this.animationContoller.fadeAnimation('zombie idles', { loop: true })
					this.currentAnimation = 'zombie idles'
				}
			}
			this.mob.scene.position.lerp(position, 0.1)
			this.lastPosition = this.mob.scene.position.clone()
			this.crowdHelper.update()
		}
		if (this.animationContoller) {
			this.animationContoller.update(this.experience.time.delta / 1000)
		}
	}
}
