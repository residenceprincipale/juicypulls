import Experience from 'core/Experience.js'
import { AnimationMixer, Group, Mesh, MeshBasicMaterial } from 'three'
import InputManager from 'utils/InputManager.js'
import addObjectDebug from 'utils/addObjectDebug.js'
import AnimationController from 'utils/AnimationController.js'

import cloneGltf from '@/webgl/utils/GltfClone'
import gsap from 'gsap'

export default class Hands {
	constructor(options = {}) {
		this.experience = new Experience()
		this.scene = this.experience.scene
		this.resources = this.scene.resources
		this.debug = this.experience.debug
		this.time = this.experience.time
		this.machine = options.machine


		// Resource
		this.resource = this.resources.items.handModel

		this.animationNames = ['Rock', 'Paper', 'Scissors'];


		this.setMaterial()
		this.setRightModel()
		this.setLeftModel()

		if (this.debug.active) this.setDebug()
	}

	setHandAnimation(i) {
		this.rightAnimationName = this.animationNames[i]
		this.playFight()

		gsap.delayedCall(4, () => {
			this.stopFight()
		})
		gsap.delayedCall(6, () => {
			this.machine.animateInnerMachineIn()
		})
	}

	playFight() {
		this.animationRight.playAnimation('CountDown')
		this.animationLeft.playAnimation('CountDown')
	}

	setupFight() {
		gsap.fromTo(this.rightModel.rotation,
			{
				x: 1.3,
				y: 2.27,
			},
			{
				x: -0.3,
				y: 1.77,
				ease: 'elastic.out',
				duration: 0.7,
				delay: 3.2
			},
		)

		gsap.fromTo(this.leftModel.rotation,
			{
				x: 1.75,
				y: -2.83,
			},
			{
				x: 0.3,
				y: -1.93,
				z: 0.2,
				ease: 'elastic.out',
				duration: 0.8,
				delay: 2.5
			},
		)

		this.leftAnimationName = this.animationNames[Math.floor(Math.random() * this.animationNames.length)];
	}

	stopFight() {
		// Compare winner (left vs right hand signs)
		const left = this.leftAnimationName;
		const right = this.rightAnimationName;
		const winner = this.getWinner(left, right);

		// Play winner's hand animation BEFORE hiding the hands
		const handPunch = (mesh) => {
			return gsap.to(mesh.position, {
				z: '-=0.5',
				yoyo: true,
				repeat: 3,
				duration: 0.2,
				ease: 'power1.inOut'
			});
		};

		let punchTween;

		if (winner === 'left') {
			punchTween = handPunch(this.leftModel);
		} else if (winner === 'right') {
			punchTween = handPunch(this.rightModel);
		}

		// After winner's hand animation finishes, reverse the initial pose
		const delayAfterPunch = punchTween ? punchTween.duration() * 2 : 0.4;

		gsap.to(this.rightModel.rotation, {
			x: 1.3,
			y: 2.27,
			ease: 'elastic.in',
			duration: 0.7,
			delay: delayAfterPunch,
		});

		gsap.to(this.leftModel.rotation, {
			x: 1.75,
			y: -2.83,
			z: 0,
			ease: 'elastic.in',
			duration: 0.8,
			delay: delayAfterPunch + 0.1,
		});
	}


	getWinner(left, right) {
		if (left === right) return 'draw';
		if (
			(left === 'Rock' && right === 'Scissors') ||
			(left === 'Paper' && right === 'Rock') ||
			(left === 'Scissors' && right === 'Paper')
		) {
			return 'left';
		}
		return 'right';
	}

	setMaterial() {
		const texture = this.resources.items.handTexture
		texture.flipY = false;
		this.material = new MeshBasicMaterial({ map: this.resources.items.handTexture, color: 0x666666 })
	}

	setRightModel() {
		this.rightResourceClone = cloneGltf(this.resource)
		this.rightAnimations = this.rightResourceClone.animations
		this.rightModel = this.rightResourceClone.scene
		this.rightModel.scale.set(0.05, 0.05, -0.05)
		this.rightModel.position.set(0.75, -0.2, -0.68)
		this.rightModel.rotation.y = 1.77
		this.rightModel.rotation.x = -0.3
		this.rightModel.name = 'Right Hand'
		this.scene.add(this.rightModel)

		this.rightModel.traverse((child) => {
			child.material = this.material
		})

		this.animationRight = new AnimationController({ animations: this.rightAnimations, model: this.rightModel })
	}

	setLeftModel() {
		this.leftResourceClone = cloneGltf(this.resource)
		this.leftAnimations = this.leftResourceClone.animations
		this.leftModel = this.leftResourceClone.scene
		this.leftModel.scale.set(0.05, 0.05, -0.05)
		this.leftModel.position.set(-0.8, -0.1, -0.77)
		this.leftModel.rotation.y = -1.93
		this.leftModel.rotation.x = 0.3
		this.leftModel.rotation.z = 0.2
		this.leftModel.name = 'Left Hand'
		this.scene.add(this.leftModel)

		this.leftModel.traverse((child) => {
			child.material = this.material
		})

		this.animationLeft = new AnimationController({ animations: this.leftAnimations, model: this.leftModel })
	}

	update() {
		this.animationRight.update(this.time.delta * 0.001)
		if (this.animationRight.current?.name === 'CountDown') {
			const animationProgress = this.animationRight.getAnimationProgress()
			if (animationProgress === 1) this.animationRight.fadeAnimation(this.rightAnimationName)
		}

		this.animationLeft.update(this.time.delta * 0.001)
		if (this.animationLeft.current?.name === 'CountDown') {
			const animationProgress = this.animationLeft.getAnimationProgress()
			if (animationProgress === 1) this.animationLeft.fadeAnimation(this.leftAnimationName)
		}
	}

	setDebug() {
		const debugFolderRight = addObjectDebug(this.debug.ui, this.rightModel)
		this.animationRight.setDebug(debugFolderRight)
		const debugFolderLeft = addObjectDebug(this.debug.ui, this.leftModel)
		this.animationLeft.setDebug(debugFolderLeft)
	}
}
